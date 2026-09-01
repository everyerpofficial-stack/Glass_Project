# Design brief — Glass Quote Suite

> The original UI/UX brief the front end was rebuilt against. Kept as a record
> of design intent. The hard constraint below still governs all future work.

I have an existing Glass Quote web application.

The application already has:

Working calculation logic

Working quotation/invoice generation

Customer management

Product management

Google Apps Script / Google Sheets backend

Existing API/backend functions

Existing business rules and data flow

I want you to completely redesign the FRONTEND UI/UX to make it look like a premium, modern, professional SaaS/business application.

🚨 MOST IMPORTANT RULE — DO NOT BREAK FUNCTIONALITY

DO NOT modify, rewrite, optimize, simplify, remove, or change any existing calculation logic.

The existing calculations are already correct and must remain EXACTLY the same.

Do NOT change:

Calculation formulas

Pricing calculations

Tax/GST calculations

Discount calculations

Quantity calculations

Total calculations

Customer data structure

Product data structure

Invoice/quotation numbering

Google Sheets columns

Google Apps Script functions

API endpoints

Backend logic

Database/storage logic

Existing business rules

PDF generation logic

Existing form submission logic

The redesign must be a frontend/UI/UX transformation only.

If you need to change HTML/CSS/React components to improve the UI, do so without changing the underlying functionality.

Before making changes, inspect the entire project and understand how the current frontend communicates with the backend.

DESIGN GOAL

Transform the current basic frontend into a high-end premium Glass & Aluminium quotation management application.

The design should feel comparable to a professionally designed SaaS product such as:

Stripe Dashboard

Linear

Vercel

Notion

HubSpot

modern enterprise ERP systems

But it should still be unique to a Glass Quote / Quotation Management business.

The final result should look like a product that could be sold commercially to professional glass companies.

DESIGN STYLE

Use a sophisticated:

Premium

Minimal

Modern

Elegant

Professional

Enterprise

Glassmorphism-inspired

Clean typography

Subtle gradients

Soft shadows

Smooth animations

Excellent spacing

Strong visual hierarchy

Avoid:

Cheap-looking gradients

Excessive animations

Cartoonish UI

Huge unnecessary elements

Overly rounded components everywhere

Clutter

Generic bootstrap-looking UI

Old-fashioned ERP appearance

The interface should feel expensive and polished.

COLOR SYSTEM

Create a professional color system.

Primary:

Deep navy / charcoal

White

Soft gray

Accent:

Premium blue / indigo

Use gradients very subtly.

Use colors consistently for:

Primary actions

Success states

Warning states

Errors

Information

Invoice status

Make sure contrast and accessibility are excellent.

APPLICATION LAYOUT

Create a professional application shell.

Sidebar

Design a premium collapsible sidebar.

Include:

Dashboard

New Quote

Quotes

Customers

Products

Invoices

Reports

Settings

The sidebar should have:

Clean icons

Active navigation indicator

Hover animations

Collapsed mode

Tooltips when collapsed

Professional spacing

At the bottom show:

User profile

Account/company information

Settings

TOP NAVIGATION

Create a clean top navigation bar.

Include:

Page title

Breadcrumbs where appropriate

Search

Notifications

User profile

Quick action button

Example:

Dashboard
Home / Dashboard

[Search...]

[+ New Quote]

DASHBOARD

Create a premium dashboard.

Show visually attractive KPI cards:

Total Quotes

Number of quotations created.

Total Customers

Number of customers.

Total Products

Number of products.

Total Revenue / Quote Value

Calculated from existing data.

Do NOT create fake calculations.

Use the application's existing data.

Add:

Recent quotations

Recent customers

Quote status overview

Revenue/value overview if existing data supports it

Quick actions

Activity section if existing data supports it

Use modern charts only if the required data already exists.

Do NOT modify backend logic just to create charts.

NEW QUOTE PAGE

This is the most important page.

Make the quotation creation process extremely professional.

Instead of a basic form, create a structured multi-section layout.

Example:

Customer Information

Use a premium card:

Customer Name
Phone
Email
GSTIN
Address
Shipping Address

Use:

Smart input fields

Icons

Proper labels

Helpful placeholders

Validation states

Quote Information

Include existing quote information.

Display:

Quote Number
Date
Validity
Reference

Do not change how these values are generated.

PRODUCT / ITEM SECTION

Create a premium item-selection interface.

Each item should have a clean row/card.

Columns:

Product
Description
Quantity
Unit
Rate
Discount
Tax
Amount
Actions

Use modern controls.

Allow:

Add Item

Use smooth animations when items are added/removed.

LIVE QUOTE SUMMARY

Create a visually prominent quotation summary panel.

Show the EXISTING calculated values:

Subtotal
Discount
Tax
Other Charges
Grand Total

Do NOT recalculate these differently.

Use the existing calculation functions.

The UI should simply display the values produced by the existing logic.

Make Grand Total visually prominent.

Example:

Subtotal ₹ XX,XXX
Discount ₹ X,XXX
Tax ₹ X,XXX

Grand Total ₹ XX,XXX

QUOTE PREVIEW

Create a professional quotation preview.

It should resemble a real premium business quotation.

Include:

Company logo
Company information
Customer information
Quote number
Quote date
Items
Subtotal
Discount
Tax
Grand Total
Terms & Conditions
Signature area

Do not modify existing PDF/business logic.

Only improve the visual presentation where safely possible.

QUOTES PAGE

Create a professional quotation management table.

Features:

Search
Filter
Sort
Pagination
Status filters

Columns:

Quote Number
Customer
Date
Amount
Status
Actions

Actions:

View
Edit
Duplicate
Download
Delete

Use beautiful dropdown/action menus.

Use status badges:

Draft
Sent
Accepted
Rejected
Expired

Only display statuses that already exist in the application.

CUSTOMERS PAGE

Create a modern customer management interface.

Include:

Search customers

Customer cards/table

Customer name
Phone
Email
GSTIN
Address
Number of quotes

Actions:

View
Edit
Delete

Add customer button:

Add Customer

Use modal/drawer forms instead of ugly browser-style forms.

PRODUCTS PAGE

Create a premium product catalog interface.

Include:

Product name
Category
Description
Unit
Price
Tax
Status

Add Product

Use a clean table with search/filter functionality.

INVOICE PAGE

Create a professional invoice interface while preserving all existing invoice functionality.

Use:

Invoice header
Customer information
Items
Amounts
Taxes
Totals
Payment information
Notes
Terms

Make it visually similar to a premium accounting application.

MODALS / DRAWERS

Do NOT use ugly browser alerts/prompts for normal interactions where avoidable.

Use premium:

Modal dialogs

Confirmation dialogs

Slide-over drawers

Toast notifications

Examples:

"Customer saved successfully"

"Quote deleted successfully"

"Product added successfully"

Use proper success/error/warning states.

FORMS

Every form must look premium.

Use:

Floating/animated focus states

Proper labels

Input icons where appropriate

Clear validation messages

Required indicators

Consistent field sizes

Proper spacing

Do not make forms unnecessarily large.

BUTTONS

Create a consistent button system.

Primary:

New Quote

Secondary:
Cancel

Danger:
Delete

Success:
Save

Ghost:
View

Buttons should have subtle hover/press animations.

TABLES

Tables should look like a modern SaaS dashboard.

Include:

Sticky headers where useful

Row hover

Proper spacing

Responsive behavior

Empty states

Loading states

Pagination

Search/filter controls

Do not make tables visually crowded.

RESPONSIVE DESIGN

The entire application MUST be responsive.

Desktop:

Full sidebar

Spacious dashboard

Multi-column layouts

Tablet:

Collapsible sidebar

Adaptive cards

Mobile:

Bottom navigation or compact sidebar

Stacked cards

Horizontally scrollable tables where necessary

Mobile-friendly forms

Large touch targets

The application must look intentionally designed on mobile, not simply squeezed into a smaller screen.

ANIMATIONS

Use subtle professional animations.

Examples:

Page transitions

Card hover

Button hover

Modal opening

Sidebar transitions

Toast notifications

Table row interactions

Item add/remove animations

Number transitions where appropriate

Keep animations fast and subtle.

Do NOT overanimate the application.

LOADING STATES

Implement beautiful skeleton loaders where appropriate.

Do not show blank screens while data loads.

Examples:

Dashboard cards
Tables
Customer lists
Product lists

EMPTY STATES

Create professional empty states.

Example:

No quotations found.

"Create your first quotation to get started."

[+ Create Quote]

Do not show ugly blank tables.

ERROR STATES

Create clear error UI.

Example:

Something went wrong.

"We couldn't load your quotations."

[Try Again]

Do not expose technical errors directly to normal users unless necessary.

TYPOGRAPHY

Use a modern professional font such as:

Inter

or another excellent SaaS UI font.

Create a clear hierarchy:

Page title
Section heading
Card title
Body
Caption
Helper text

Do not use too many font sizes.

ICONS

Use a professional icon library such as Lucide Icons if the project supports it.

Do NOT use random emoji as UI icons.

Icons should be consistent throughout the application.

DARK MODE

If the existing application supports dark mode, redesign it properly.

If not, structure the CSS/theme system so dark mode can be added later without rewriting the application.

MICRO-INTERACTIONS

Add polished micro-interactions:

Hover states

Focus states

Active states

Success feedback

Smooth transitions

Tooltips

Confirmation feedback

These should make the application feel premium without distracting users.

IMPORTANT TECHNICAL REQUIREMENT

Before changing anything:

Inspect the complete project.

Identify all frontend files.

Identify all backend/API functions.

Identify every calculation function.

Identify how data flows between frontend and Google Apps Script/Sheets.

Identify all existing event handlers.

Identify all form submissions.

Identify all PDF/invoice generation functions.

Then redesign the frontend around the existing functionality.

STRICT CALCULATION PROTECTION

Treat existing calculation functions as READ-ONLY.

For example, if the application currently has functions responsible for:

subtotal

discount

tax

total

quotation amount

invoice amount

pricing

quantity

item calculations

DO NOT rewrite those functions.

If necessary, create a new UI layer that calls the existing functions.

The frontend should display existing results rather than creating a second calculation system.

There must be:

ONE source of truth for calculations.

Never duplicate calculation logic in the UI.

DATA PROTECTION

Do not rename existing backend fields unless absolutely necessary.

Do not change Google Sheet column names.

Do not change Apps Script function names.

Do not change API request/response structures.

Do not change existing database/storage schemas.

Do not change authentication logic.

Do not remove working features.

CODE QUALITY

Keep the code:

Modular

Maintainable

Reusable

Clean

Component-based

Production-ready

Create reusable components such as:

Sidebar
Topbar
Button
Input
Select
Modal
Drawer
Card
Table
Badge
Toast
LoadingSkeleton
EmptyState
QuoteItem
QuoteSummary

Avoid duplicating CSS/UI code.

PERFORMANCE

The redesign must not make the application unnecessarily slow.

Avoid:

Huge libraries

Unnecessary dependencies

Excessive animations

Large images

Unnecessary API calls

Optimize the frontend where possible without changing functionality.

FINAL QUALITY CHECK

After implementing the redesign, test every existing workflow.

Especially:

Create customer

Edit customer

Delete customer

Create quote

Add products

Change quantity

Change price

Apply discount

Apply tax

Calculate total

Save quote

Edit quote

Delete quote

Generate PDF

Download PDF

Invoice generation

Existing Google Sheets synchronization

Existing Apps Script functions

Existing API calls

The result must be:

Same functionality + Same calculations + Completely upgraded premium UI.

IMPORTANT EXECUTION INSTRUCTION

Do NOT immediately start randomly modifying files.

First inspect the project architecture and understand the existing implementation.

Then make the UI redesign systematically.

If you find a calculation or backend function that appears outdated, DO NOT modify it as part of this redesign.

Prioritize:

FUNCTIONALITY SAFETY > UI DESIGN

The final application should look like a premium commercial SaaS product, while all existing calculations and backend functionality continue working exactly as before.

After implementation, report:

Files changed

Components created

UI improvements made

Any dependencies added

Confirmation that calculation logic was not changed

Confirmation that backend/API functionality was not changed

Any issues that still need attention

