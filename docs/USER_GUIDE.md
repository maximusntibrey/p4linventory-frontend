# MVP Quick User Guide

## Sign in

Open `http://localhost:5173`, enter the Login ID and password provided for your local or deployed environment, and complete a forced password change when prompted.

## Navigation

The top bar shows the active branch and Login ID. Front Staff must choose a branch on the first login of the local Africa/Accra day. Use Switch branch only when the role is allowed.

## Common flows

1. Items: Super Admin or Warehouse Admin adds and edits items, sets status and uploads a permitted image.
2. Receive stock: Warehouse Admin records supplier receipt details, reviews the lines and confirms the receipt.
3. Dispatch: Warehouse Admin selects an active destination branch and dispatches available stock.
4. Receive a delivery: Branch Admin or an authorised Front Staff user enters received quantities, reviews shortfalls and confirms.
5. Sell: find an item, enter whole quantities, choose payment, review the server total and confirm once.
6. Find: search an item and compare branch quantities without seeing costs.
7. Activity and shortfalls: authorised users open them from Home and cannot resolve a shortfall without a note.

## Accessibility

The interface works at 360 px phone width, uses 44 px minimum targets, labels icons and fields, shows status with words and icons, and supports keyboard navigation.

## Local test access

Use only the local development Login IDs and passwords from `.env`. Do not reuse production credentials or enter real customer or payment data into the local environment.
