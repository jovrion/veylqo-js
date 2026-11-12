# Svelte example

Use the Veylqo custom element directly in Svelte.

```svelte
<script>
  import "../../packages/element/src/index.js";
</script>

<veylqo-share
  label="Share link"
  endpoint="https://veylqo.example"
  key="pk_example"
  url="https://example.org"
  title="Check this out"
  text="Less URL. More destination."
/>
```
