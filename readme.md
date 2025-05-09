# TLDR/TLDW: Too Long Didn't Read/Too Long Didn't Watch

Summarize web pages and YouTube videos using any OpenAI Compatible API and Model

## Loading the Extension

To load this extension into your Google Chrome browser:

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable "Developer mode" by toggling the switch in the top right corner.
3.  Click the "Load unpacked" button in the top left corner.
4.  Select the directory where you have cloned or downloaded this project.

The extension should now appear in your list of installed extensions.

## Configuring Settings

To access and configure the extension's settings:

1.  Click on the extension's icon in the Chrome toolbar.
2.  In the popup that appears, click on the "Settings" button.
3.  This will open the settings page where you can adjust the extension's configuration. You will find the following fields:
    *   **OpenAI Compatible Endpoint URL:** This is the API endpoint for the summarization service. It defaults to `https://api.openai.com/v1/chat/completions`. You can change this if you are using a different compatible service.
    *   **Model Name:** Specify the AI model to be used for summarization. The default is `gpt-4.1-nano`.
    *   **API Key:** Enter your API key for the summarization service here. This key is stored securely.
    *   **Save Settings button:** Saves the current configuration.
    *   **Export Settings and Import Settings buttons:** These allow you to save your current configuration to a JSON file and load a previously saved configuration, respectively. This is useful for backing up settings or transferring them between browsers/computers.

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.
