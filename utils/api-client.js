/**
 * Summarize content using OpenAI compatible API
 * @param {string} content - The content to summarize
 * @param {boolean} isYouTube - Whether the content is from YouTube
 * @returns {Promise<string>} - The summarized content
 */
async function summarizeWithOpenAI(content, isYouTube) {
  // Get settings from storage
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({
      endpointUrl: 'https://api.openai.com/v1/chat/completions',
      modelName: 'gpt-4.1-nano',
      apiKey: '',
      temperature: 0.3, // Default value
      max_tokens: 500 // Default value
    }, async (settings) => {
      // Check for settings retrieval errors
      if (chrome.runtime.lastError) {
        reject(new Error(`Failed to load settings: ${chrome.runtime.lastError.message}`));
        return;
      }

      // Validate API key - comprehensive check
      if (!settings.apiKey || settings.apiKey.trim() === '') {
        reject(new Error('API key is missing. Please add it in the extension settings to use the summarization feature.'));
        return;
      }
      
      try {
        // Create the appropriate prompt based on content type
        const prompt = isYouTube
          ? ` You are a helpful AI assistant that connects to YouTube videos, downloads their transcripts, and provides detailed summaries. Your goal is to create comprehensive and easy-to-understand summaries, highlighting all key points discussed.
Here's how you should operate:
 Download the transcript. If a transcript is unavailable, inform the user and cease operation.
 Analyze the transcript to identify key themes and arguments.
 Summarize the video's content, ensuring a comprehensive overview.
 Structure the summary using bullet points where helpful, especially when listing arguments, steps, or different viewpoints.
Use bold or other formatting for bullet points or where it makes sense, for emphasis or to highlight important topics.  Make sure any sub headings are also bold formatted or made to stand out.
 Use clear and concise language.
 Present the information in a logical order.

Transcript:   ${content}`
          : `Take the content that was passed over and summarize it. Aim to cover the topic thoroughly by exploring various aspects and perspectives. Response Structure:
Make sure the story is thoroughly expanded, include snippets from the article or page if appropriate.
Provide comprehensive coverage of the topic, including detailed information and multiple perspectives.
Use clear headings and bullet points.
Highlight key takeaways.: ${content}`;
        
        // Make API request to OpenAI compatible endpoint
        const response = await fetch(settings.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: settings.modelName,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that provides concise, accurate summaries.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: settings.temperature,
            max_tokens: settings.max_tokens
          })
        });
        
        // Handle specific API error cases
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle authentication errors (invalid API key)
          if (response.status === 401) {
            throw new Error('Invalid API key. Please check your API key in the extension settings.');
          }
          
          // Handle rate limiting or quota exceeded
          if (response.status === 429) {
            throw new Error('API rate limit exceeded. Please try again later or check your subscription tier.');
          }
          
          // Handle other API errors with detailed messages
          throw new Error(`API error (${response.status}): ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();

        // Validate response structure for summary
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from API for summary. The response does not contain the expected data structure.');
        }

        const summary = data.choices[0].message.content.trim();

        // --- Second API call for title generation ---
        const titlePrompt = `Please summarize the following text into a concise title of less than 10 words. Output only the title itself, without any introductory phrases like 'Title:'"\n\nText: ${summary}`;

        const titleResponse = await fetch(settings.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: settings.modelName,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that generates concise titles.'
              },
              {
                role: 'user',
                content: titlePrompt
              }
            ],
            temperature: settings.temperature,
            max_tokens: 20 // Title should be short
          })
        });

        // Handle specific API error cases for title generation
        if (!titleResponse.ok) {
          const errorData = await titleResponse.json().catch(() => ({}));
          // Log the error but don't fail the entire operation if title generation fails
          console.warn(`Title generation API error (${titleResponse.status}): ${errorData.error?.message || titleResponse.statusText}`);
          // Resolve with summary only if title generation fails
          resolve({ summary: summary, title: 'Untitled' });
          return; // Exit the promise
        }

        const titleData = await titleResponse.json();

        // Validate response structure for title
        if (!titleData.choices || !titleData.choices[0] || !titleData.choices[0].message) {
           console.warn('Invalid response format from API for title. The response does not contain the expected data structure.');
           // Resolve with summary only if title generation fails
           resolve({ summary: summary, title: 'Untitled' });
           return; // Exit the promise
        }

        const title = titleData.choices[0].message.content.trim();

        // Resolve with both summary and title
        resolve({ summary: summary, title: title });

      } catch (error) {
        // Add more context to network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          reject(new Error(`Network error: Could not connect to API endpoint. Please check your internet connection and the endpoint URL in settings.`));
        } else {
          reject(error);
        }
      }
    });
  });
}

// Export functions
export { summarizeWithOpenAI };