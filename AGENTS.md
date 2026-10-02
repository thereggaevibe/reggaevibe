<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Shop product imagery must use Printful's public preview CDN URLs, not legacy WordPress upload thumbnails, because the latter redirect to missing files.
- Magazine categories use `/category/$slug` and database-filtered article queries before pagination, so category pages stay shareable and never mix unrelated stories.
