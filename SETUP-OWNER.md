# Private store administration setup

The storefront and administration dashboard are deployed at:

- Store: https://mhmdqabl615-del.github.io/zain-cosmetics-store/
- Owner dashboard: https://mhmdqabl615-del.github.io/zain-cosmetics-store/admin.html

The dashboard is a public page, but **only an explicitly authorized Supabase owner can sign in and change the store**. Product, customer and order access is additionally protected in PostgreSQL with row-level security (RLS). Orders are entered by the owner by hand; there is no online checkout or card-payment processing.

## 1. Create your private database and owner login

1. Create your own Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard/projects). Save its database password somewhere private.
2. In **Authentication → URL Configuration**, set **Site URL** to `https://mhmdqabl615-del.github.io/zain-cosmetics-store/admin.html` and add `https://mhmdqabl615-del.github.io/zain-cosmetics-store/**` to **Redirect URLs**. Keep public sign-ups disabled.
3. In **Authentication → Users**, securely invite or create your owner account.
4. Open **SQL Editor** and copy the contents of [`supabase/setup.sql`](supabase/setup.sql). Replace `replace-with-your-email@example.com` with the owner's invited email, then run the script. It installs the tables and access policies and authorizes only the invited account as the initial owner. Run the SQL from the Supabase dashboard while signed in as project owner.
5. In **Project Settings → API**, copy the project's URL and its **anon / publishable** public key. Never paste the `service_role` or a secret key into a web page, source control, or this dashboard.
6. Open [`admin.html`](admin.html), enter the Supabase URL and public key, then sign in using the invited owner's credentials.

Only authenticated administrators can read customer names, phone numbers, or orders. Anonymous visitors can read active products only; no public account can edit products, change stock, or read, add, or change orders.

## 2. Connect the public storefront to your catalog

The public storefront catalog remains hidden as requested: products remain saved in Supabase and manageable in the owner dashboard, but the public page does not load or display them. The storefront and catalog renderer include category-filter support for when you decide to show products again; displaying the catalog requires adding the `supabase-config.js` and `storefront-catalog.js` script tags back to `index.html` and publishing the site.

Once the database is ready:

1. Set the URL and public key in [`supabase-config.js`](supabase-config.js) in the public repository. For example:

   ```js
   window.ZAIN_SUPABASE_CONFIG = {
     url: "https://your-project.supabase.co",
     anonKey: "your-project-anon-or-publishable-key",
   };
   ```

2. Restore the storefront catalog script tags in `index.html` and commit the change. GitHub Pages automatically publishes the connected catalog. The dashboard saves the same public settings locally in the browser, so repeat its connection step on another browser if needed.
3. Add a product in the dashboard and type its section in **القسم** (or choose an existing section). Each product belongs to one section; the public shop builds a filter for every section represented by an active product. Active products appear in the storefront catalog; hidden products do not. Products without stock appear as sold out.

## 3. Record real orders

Use **سجّلي طلبًا** in the owner dashboard when an order arrives by phone, social media, or another sales channel. Update its status as it is confirmed or fulfilled. The dashboard records the entered customer contact information and product/amount in your Supabase database; free-text order information is retained as a private order snapshot. You are responsible for handling customer data according to applicable privacy requirements.

## Protecting your project

- Keep public sign-ups disabled. Never add an administrator through the public storefront.
- Never expose a Supabase `service_role` key in website files, a GitHub commit, or a message.
- Use the dashboard's invitation and recovery facilities from the Supabase owner account to manage login credentials.
- The public setup SQL intentionally contains only an example email; replace it with the owner's real email when running it in your private Supabase SQL Editor. Do not commit your actual email, customer data, or any service secret to the repository.
