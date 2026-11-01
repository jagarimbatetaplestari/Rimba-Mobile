# Existing-project schema baseline

Rimba already had public tables, Auth triggers and Storage policies when this release audit started, but no recorded migration history. The old complete-schema script is retained here for historical inspection only. It does not describe every live column/policy and must not be replayed: it reintroduces client-written entitlements and unsafe legacy deletion.

Active files in ../migrations now use the exact versions recorded by Supabase after the approved deployment. Do not invent a history entry asserting that the old script ran unchanged. A fresh empty project requires an audited schema export/bootstrap; this directory is not that bootstrap. No user data is included here.

Deploy forward fixes. Do not restore broad profile email reads or client subscription writes as a compatibility workaround. Review any grant additions field by field. Account deletion still needs the replacement Edge Function and legacy-RPC retirement; the archived function is not an approved implementation.
