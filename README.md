# Papyrd

Papyrd is a mobile app for iOS and Android that connects to OPDS servers to download eBooks and KOSync servers to synchronize reading progress.

This app is part of the same project as the [papyrd server](https://github.com/RileyMathews/papyrd-server/tree/main) which provides OPDS and Kosync APIs.
However, this app will always aim to stay compatible with any OPDS and Kosync server that follows the specifications.
You are free and welcome to use this app with any OPDS and Kosync server of your choosing.
Any incompatability with an OPDS or KOsync compliant server will be treated as a bug.

# Installing
## Android
The android APK is published in Github releases as part of the deployment flow. If you prefer to use the play store the android app is currently in closed testing phase and I am looking for beta testers! Feel free to reach out in a github issue or through any other channel and I am happy to add you to the group.

## iOS
The iOS version of the app is currently available in test flight. If you would like to be added feel free to reach out in a github issue or any other way you can find to contact me and I would be happy to add you to the group.

# AI Disclosure
I make regular use of AI tools in my development workflow, but I do not "vibe code" and review all AI-generated code before committing it. Given the mixed opinions of AI in the homelab and self-hosting communities, I felt a need to disclose this use so you can make an informed decision.
(Additional caveat here that I am primarily a backend developer in my day job. I do have some proefessional React experience but it is not my day to day. So any poor code quality is just as much my own fault as any AI).

# Server
This app allows configuring multiple OPDS servers for downloading eBooks, as well as one KOSync-compatible server for syncing reading progress. These can be the same server or different servers. There are multiple options for self-hosted servers that provide both functionalities.

## OPDS
For OPDS, make sure that the URL you configure for the server endpoint is the root of the OPDS discovery tree. This is not always the root URL on all servers. For example, with the Papyrd server, the OPDS entry point is `https://papyrd.yourdomain.com/opds`.

# Why make this app
There are a small handful of ereader apps out there that I found that work with OPDS and Kosync. However at least in my investigation
I wasn't able to find any apps that hit all of the following criteria
* iOS and Android
* targeted at the self hosted crowd
* zero commercial interest
* open source

So I decided to try to spin up this app to explore mobile dev and expand my experience.
