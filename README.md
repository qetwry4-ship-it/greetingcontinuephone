# Greeting Continue for SillyTavern

This extension adds compact **‹ / 1/5 / ›** Greeting controls to the chat controls.

It does NOT call the model.

When you choose the main greeting or one of the character's `alternate_greetings`, the exact saved greeting text is inserted into the current chat as a normal character message. The current chat history is preserved.

## What it does

- Reads the current character's main `first_mes` and `data.alternate_greetings`.
- Lets you cycle through greetings with **‹ / ›** and choose the current one with the center button.
- Adds the chosen greeting as a new character message.
- Resolves normal SillyTavern macros such as `{{user}}` and `{{char}}`.
- Saves the current chat.
- Does not replace or delete existing messages.
- Does not send a generation request.

## Install

### Local/manual

Copy this folder to:

`SillyTavern/public/scripts/extensions/third-party/greeting-continue/`

Then reload SillyTavern.

### Git installation

Put these files in a Git repository and install the repository from:

Extensions -> Install Extension

using the repository URL.

## Important

The extension intentionally adds the greeting as a NEW assistant/character message. Therefore it is best used immediately after your latest user message when you want the greeting to serve as the bot's ready-made response.

It does not create a new chat and does not alter the character card.


## Mobile version

This build includes larger touch targets, a mobile-safe panel layout, support for device safe areas, and a fix for the controls observer so it can recover when SillyTavern rebuilds the chat composer.
