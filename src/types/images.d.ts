declare module '*.png' {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module '*.jpg' {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module '*.jpeg' {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module '*.svg' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any;
  export default content;
}

declare module '*.ico' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any;
  export default content;
}

declare module '*.webp' {
  const content: import("next/image").StaticImageData;
  export default content;
}
