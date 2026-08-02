# Mangalsaath v1.4.0 Testing Guide

## Start locally
1. Extract the ZIP.
2. Open the project folder in VS Code.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

## Public UI checks
- Open Home and confirm hero, trust indicators, statistics, value cards, journey and CTA sections.
- Check navigation links: Home, Discover and About.
- Check footer links: Discover Profiles, Create Profile, Member Login, About, Contact, Privacy and Terms.
- Confirm `contact@mangalsaath.com` opens the default email application.
- Test at desktop, tablet and mobile widths.

## Core workflow checks
- Register a new member.
- Log in with an existing member.
- Browse profiles and open a profile.
- Send an interest and a message.
- Edit profile details and photos.
- Log in as admin and open the admin dashboard.

## Build verification
`npm run build` passed successfully on 17 July 2026.
