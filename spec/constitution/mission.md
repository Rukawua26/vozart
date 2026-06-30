# Mission

VozArt is an AI-powered drawing application where users control a Fabric.js canvas with Spanish voice commands.

## Goals

- Let users draw, edit, clear, export, and generate images through voice or manual text input.
- Keep Spanish voice interaction first-class.
- Support multiple AI providers through the server-side provider registry.
- Keep the web app and Android APK aligned without signing secrets in the repo.

## Non-Goals

- Do not couple UI code directly to individual AI providers.
- Do not break the current dev Android identity unless explicitly requested.
- Do not add provider keys, signing files, or deployment secrets to the repository.
