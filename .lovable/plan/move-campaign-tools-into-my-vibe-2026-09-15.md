# Move campaign tools into My Vibe

## Changes
- Remove the Airplay Report from My Vibe.
- Move the full “Build your campaign” form and “Your campaigns” history from Advertise With Us to directly below the Advertiser Dashboard in My Vibe.
- Keep PayPal checkout and return confirmation working from the new My Vibe location.
- Add a trash icon beside pending campaign orders only, with a confirmation step and immediate list refresh after deletion.
- Secure deletion so a signed-in user can delete only their own pending campaign; paid or completed campaigns cannot be deleted.

## Technical details
- Reuse the existing campaign query, pricing, placement choices, and PayPal checkout function.
- Add an authenticated server action that verifies ownership and `pending` status before deleting.
- Remove moved state, imports, and markup from the public advertising page while leaving the three package offers and value-add copy unchanged.
- Apply the required database permission for owner deletion of pending orders, then verify My Vibe, Advertise With Us, PayPal return handling, and mobile layout.
