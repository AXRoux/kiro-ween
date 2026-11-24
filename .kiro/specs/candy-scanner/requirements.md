# Requirements: candy scanner

## Introduction
Trick or Read lets a blind or low-vision person identify Halloween treats by holding them up to a webcam: candy, and better-for-you alternatives
such as fig bars, granola bars, fruit snacks and pretzels. The app names the treat out loud, warns about the allergens the user cares about, and reports whether the wrapper is sealed. The
interface is a phone-shaped app wearing a stone castle for a case; its every element carries information for sighted companions
and judges, and its controls can be found by touch.

## Glossary
- **Treat:** candy, or a better-for-you alternative handed out instead (fig bar, granola bar, fruit snacks, pretzels...).
- **Haul:** the list of treats scanned this session.
- **Label data:** facts from Open Food Facts for a scanned barcode.
- **Vision read:** the model's description of the wrapper when there is no barcode.
- **Verdict:** one of Safe, Ask someone, Beware.

## Requirement 1: opening the gate
**User story:** As a blind user, I want one obvious action to start, so that the camera and voice are ready without
hunting for controls.
1. WHEN the app loads THE SYSTEM SHALL show a single full-width "Open the gate" button that has focus.
2. WHEN the user activates it THE SYSTEM SHALL request the camera, unlock speech, and say how to scan.
3. IF the camera is denied or missing THEN THE SYSTEM SHALL say so and explain how to allow it.

## Requirement 2: hands-free scanning
**User story:** As a blind user holding candy in one hand, I want scanning to start on its own, so that I do not have
to find a button.
1. WHILE auto-scan is on, WHEN the image changes and then holds still for 0.8 seconds, THE SYSTEM SHALL scan.
2. WHEN the user taps the camera window, presses Space or says "scan" THE SYSTEM SHALL scan immediately.
3. WHILE the frame is too dark to read THE SYSTEM SHALL say "Too dark. Turn on a light." at most once every 8 seconds.
4. THE SYSTEM SHALL NOT scan the same still scene twice in a row.

## Requirement 3: identifying the treat
**User story:** As a user, I want the most reliable answer available, so that I can trust what I hear.
1. WHEN a barcode is visible THE SYSTEM SHALL look it up in Open Food Facts and use its name, brand and allergens.
2. WHEN no barcode is found, or the lookup fails, THE SYSTEM SHALL send one frame to `/api/identify` for a vision read.
3. WHEN the vision read cannot see a treat THE SYSTEM SHALL speak its guidance (for example "show the front").
4. THE SYSTEM SHALL send at most one frame per scan, downscaled to 768px, and never store it.
5. WHEN the treat is not candy (a fig bar, granola bar, fruit snacks, pretzels...) THE SYSTEM SHALL read it, check its
   allergens and wrapper, and name its kind ("fig bar") exactly as it does for candy.

## Requirement 4: speaking the result
**User story:** As a user, I want the important part first and details on request.
1. WHEN a treat is identified THE SYSTEM SHALL speak: name, kind, allergen warning, wrapper condition, in that order.
2. WHEN an allergen from the user's list comes from label data THE SYSTEM SHALL say "Warning: contains <allergen>".
3. WHEN it comes only from a vision read THE SYSTEM SHALL say "likely contains <allergen>, ask someone to check the label".
4. WHEN the user presses M or says "more" THE SYSTEM SHALL speak ingredients, sugar and calories where known.
5. WHEN the user presses R or says "repeat" THE SYSTEM SHALL repeat the last result.

## Requirement 5: the verdict
1. THE SYSTEM SHALL compute the verdict from the rules in `product.md`, never from the model's opinion alone.
2. WHEN the verdict is Beware THE SYSTEM SHALL play the warning toll, announce assertively and turn the gatehouse window and arrow slits red.
3. WHERE the device can vibrate THE SYSTEM SHALL vibrate the verdict: one short buzz Safe, two Ask someone, three long Beware.

## Requirement 6: allergen profile
1. THE SYSTEM SHALL let the user choose from: peanuts, tree nuts, milk, egg, soy, wheat/gluten, sesame, coconut.
2. THE SYSTEM SHALL keep the choice on the device (localStorage) and speak it back when changed.

## Requirement 7: the haul
1. WHEN a treat is identified THE SYSTEM SHALL add it to the haul, counting repeats.
2. WHEN the user presses B or says "haul" THE SYSTEM SHALL speak the count and the items, warnings first.

## Requirement 8: accessibility and motion
1. THE SYSTEM SHALL meet the rules in `.kiro/steering/accessibility.md`.
2. WHEN `prefers-reduced-motion` is set THE SYSTEM SHALL stop decorative animation and keep the status visible.

## Requirement 9: privacy and safety of the key
1. THE SYSTEM SHALL keep the Anthropic key on the server and rate-limit `/api/identify` per client.
2. THE SYSTEM SHALL reject frames over 2 MB and anything that is not a JPEG or PNG data URL.

## Requirement 10: finding things by touch
**User story:** As a blind user on a phone, I want the controls where I left them, so that I can use the app without seeing it.
1. THE SYSTEM SHALL make the camera window a single "Read now" button, the largest target on the screen.
2. THE SYSTEM SHALL keep Repeat, More, Haul and Settings as tiles at least 64px tall, in the same positions in every state.
3. WHILE the voice is speaking THE SYSTEM SHALL show a "Stop" control at the top of the screen that stops it.
4. WHILE the camera is on THE SYSTEM SHALL keep the screen awake where the browser allows it.
