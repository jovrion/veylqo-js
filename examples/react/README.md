# React example

Use the Veylqo custom element directly in React without a wrapper.

```jsx
import "../../packages/element/src/index.js";

export function App() {
  return (
    <veylqo-share
      label="Share link"
      endpoint="https://veylqo.example"
      key="pk_example"
      url="https://example.org"
      title="Check this out"
      text="Less URL. More destination."
    />
  );
}
```

For React < 19, custom-element event listeners are not auto-bound from JSX props.
Attach listeners with a ref and `addEventListener`.
