# Papyrd

Papyrd is a mobile app for iOS and Android that connects to OPDS servers to download eBooks and KOSync servers to synchronize reading progress.

# Installing
The app is currently only available on TestFlight for iOS and Google Play testing channels. If you would like to test the app, please open an issue on this repository for now, and we can coordinate from there as needed. I will work on more formal communication areas soon.

# AI Disclosure
I make regular use of AI tools in my development workflow, but I do not "vibe code" and review all AI-generated code before committing it. If my code looks bad, it is because I am not a regular React/JS developer, so blame me, not the AI. Given the mixed opinions of AI in the homelab and self-hosting communities, I felt a need to disclose this use so you can make an informed decision.

# Server
This app allows configuring multiple OPDS servers for downloading eBooks, as well as one KOSync-compatible server for syncing reading progress. These can be the same server or different servers. There are multiple options for self-hosted servers that provide both functionalities.

## OPDS
For OPDS, make sure that the URL you configure for the server endpoint is the root of the OPDS discovery tree. This is not always the root URL on all servers. For example, with the Papyrd server, the OPDS entry point is `https://papyrd.yourdomain.com/opds`.
