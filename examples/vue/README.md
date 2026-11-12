# Vue example

Use the Veylqo custom element directly in Vue templates.

```vue
<template>
  <veylqo-share
    label="Share link"
    endpoint="https://veylqo.example"
    key="pk_example"
    url="https://example.org"
    title="Check this out"
    text="Less URL. More destination."
  />
</template>

<script setup>
import "../../packages/element/src/index.js";
</script>
```
