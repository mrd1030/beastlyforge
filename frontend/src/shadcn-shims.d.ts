/* eslint-disable */
// Make all shadcn .jsx components accept any props (loose typing for the bridge)
declare module "@/components/ui/*" {
  const C: any;
  export = C;
}
declare module "@/components/ui/button" {
  export const Button: any;
  export const buttonVariants: any;
}
declare module "@/components/ui/sonner" {
  export const Toaster: any;
}
