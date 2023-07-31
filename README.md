# TalkWithCode - VSCode Extension

TalkWithCode is an AI-powered VSCode extension that allows you to have conversations directly with your codebase. It uses advanced natural language processing to understand questions about your code and provide relevant answers in markdown format.

## Features

- Ask questions directly at your codebase

## Getting Started

### Installation

1. Install the TalkWithCode extension from the VSCode Marketplace
2. Get an API token from [Polyfact](https://app.polyfact.com) and add it to your VSCode settings

### Configuration

Add your Polyfact API token to your VSCode settings:

```json
"talk-with-code.token": "YOUR_TOKEN"
```

You can also customize the AI prompt:

```json
"talk-with-code.prompt": "Imagine you are..."
```

### Usage

Bring up the command palette (Ctrl/Cmd + Shift + P) and run:

```
TalkWithCode
```

Or use the default keybinding:

- Mac: Cmd + Option + Shift + P
- Windows: Ctrl + Alt + Shift + P

You can also click direclty on "TalkWithCode" in your status Bar (At the bottom)

Then enter your question in natural language about your code. The extension will analyze your code and return an answer in markdown format.

For example:

- "How do I create a new user?"
- "What is the purpose of this method?"
- "Explain how this feature works"

## Code Overview

The extension vectorizes your code to create embeddings that allow the AI model to understand your codebase. It uses the Polyfact API to generate answers.

## Contributing

Pull requests welcome! Feel free to open issues for any bugs or feature requests.
