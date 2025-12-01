# Favicon Implementation Guide

## Files Generated

### Browser Favicons
- `favicon.ico` - Multi-size ICO (16, 32, 48, 64, 128, 256)
- `favicon-16x16.png` - PNG 16×16 per tab
- `favicon-32x32.png` - PNG 32×32 per tab
- `favicon-96x96.png` - PNG 96×96 per tab
- `favicon-light.svg` - SVG per light mode
- `favicon-dark.svg` - SVG per dark mode
- `pinned-tab.svg` - Safari Pinned Tab (monochrome)

### Apple Touch Icons
- `apple-touch-icon.png` - Default Apple Touch Icon 180×180
- `apple-touch-icon-180.png` - iPhone/iPad Retina 180×180
- `apple-icon-152x152.png` - iPad Retina 152×152
- `apple-icon-144x144.png` - iPad Retina 144×144
- `apple-icon-120x120.png` - iPhone Retina 120×120
- `apple-icon-114x114.png` - iPhone Retina 114×114
- `apple-icon-76x76.png` - iPad 76×76
- `apple-icon-72x72.png` - iPad 72×72
- `apple-icon-60x60.png` - iPhone 60×60
- `apple-icon-57x57.png` - iPhone 57×57

### Android/PWA Icons
- `android-chrome-512.png` - Android icon 512×512
- `android-chrome-192.png` - Android icon 192×192
- `android-icon-144x144.png` - Android icon 144×144
- `android-icon-96x96.png` - Android icon 96×96
- `android-icon-72x72.png` - Android icon 72×72
- `android-icon-48x48.png` - Android icon 48×48
- `android-icon-36x36.png` - Android icon 36×36


### Microsoft Tiles
- `ms-icon-310x310.png` - Large tile 310×310
- `ms-icon-150x150.png` - Medium tile 150×150
- `ms-icon-144x144.png` - Small tile 144×144
- `ms-icon-70x70.png` - Tiny tile 70×70

### Configuration Files
- `site.webmanifest` - Web App Manifest
- `browserconfig.xml` - Microsoft Browser Configuration
- `snippet.html` - HTML snippet for <head>

## Installation

1. Copy all files to your `/favicons/` directory
2. Copy the content of `snippet.html` into your HTML `<head>` section
3. If you want to use a different path, update all references in the snippet

## Quick Start

Add this to your HTML `<head>`:

```html
<!-- ========== FAVICON IMPLEMENTATION START ========== -->

<!-- Fallback universale -->
<link rel="shortcut icon" href="/favicons/favicon.ico" type="image/x-icon">

<!-- PNG per tab classiche -->
<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicons/favicon-96x96.png">

<!-- SVG + dark/light -->
<link rel="icon" href="/favicons/favicon-light.svg" type="image/svg+xml" media="(prefers-color-scheme: light)">
<link rel="icon" href="/favicons/favicon-dark.svg"  type="image/svg+xml" media="(prefers-color-scheme: dark)">

<!-- Apple Touch Icons (tutte le dimensioni per diversi dispositivi) -->
<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon-180.png">
<link rel="apple-touch-icon" sizes="152x152" href="/favicons/apple-icon-152x152.png">
<link rel="apple-touch-icon" sizes="144x144" href="/favicons/apple-icon-144x144.png">
<link rel="apple-touch-icon" sizes="120x120" href="/favicons/apple-icon-120x120.png">
<link rel="apple-touch-icon" sizes="114x114" href="/favicons/apple-icon-114x114.png">
<link rel="apple-touch-icon" sizes="76x76" href="/favicons/apple-icon-76x76.png">
<link rel="apple-touch-icon" sizes="72x72" href="/favicons/apple-icon-72x72.png">
<link rel="apple-touch-icon" sizes="60x60" href="/favicons/apple-icon-60x60.png">
<link rel="apple-touch-icon" sizes="57x57" href="/favicons/apple-icon-57x57.png">
<link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png">

<!-- Android/Chrome Icons -->
<link rel="icon" type="image/png" sizes="192x192" href="/favicons/android-chrome-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/favicons/android-chrome-512.png">
<link rel="icon" type="image/png" sizes="144x144" href="/favicons/android-icon-144x144.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicons/android-icon-96x96.png">
<link rel="icon" type="image/png" sizes="72x72" href="/favicons/android-icon-72x72.png">
<link rel="icon" type="image/png" sizes="48x48" href="/favicons/android-icon-48x48.png">
<link rel="icon" type="image/png" sizes="36x36" href="/favicons/android-icon-36x36.png">

<!-- Microsoft Tiles -->
<meta name="msapplication-TileColor" content="#ffffff">
<meta name="msapplication-TileImage" content="/favicons/ms-icon-144x144.png">
<meta name="msapplication-square70x70logo" content="/favicons/ms-icon-70x70.png">
<meta name="msapplication-square150x150logo" content="/favicons/ms-icon-150x150.png">
<meta name="msapplication-wide310x150logo" content="/favicons/ms-icon-310x310.png">
<meta name="msapplication-square310x310logo" content="/favicons/ms-icon-310x310.png">
<meta name="msapplication-config" content="/favicons/browserconfig.xml">

<!-- Safari pinned tab (SVG monocromatico nero) -->
<link rel="mask-icon" href="/favicons/pinned-tab.svg" color="#5bbad5">

<!-- PWA -->
<link rel="manifest" href="/favicons/site.webmanifest">

<!-- UI del browser -->
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0f19" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">

<!-- ========== FAVICON IMPLEMENTATION END ========== -->
```

## Path Configuration

All icons are configured to be in: **`/favicons/`**

If you need to change this path:
1. Update the `iconsPath` variable when generating the snippet
2. Make sure all files are in the correct directory
3. Update your web server configuration if needed

## Browser Support

- ? Chrome/Edge: ICO, PNG, SVG, PWA Manifest
- ? Firefox: ICO, PNG, SVG
- ? Safari: ICO, PNG, SVG, Pinned Tab
- ? iOS Safari: Apple Touch Icon (all sizes)
- ? Android Chrome: PWA Manifest + Maskable
- ? Windows: Microsoft Tiles (browserconfig.xml)

## MIME Types

Ensure your server sends correct MIME types:
- `.ico` ? `image/x-icon`
- `.png` ? `image/png`
- `.svg` ? `image/svg+xml`
- `.webmanifest` ? `application/manifest+json`
- `.xml` ? `application/xml`

## Testing

### Browser Icons
- Open your site in Chrome, Firefox, Safari
- Check the favicon in the browser tab
- Test light/dark mode switching (SVG favicons)

### Apple Touch Icons
- Add to Home Screen on iOS Safari
- Check the icon on the home screen

### PWA Installation
- Test PWA installation on mobile (Android Chrome)
- Test maskable icon adaptation
- Validate manifest: https://manifest-validator.appspot.com/

### Microsoft Tiles
- Pin your site to Start Menu on Windows
- Check tile appearance

### DevTools
- Browser DevTools ? Application ? Manifest
- Check all icon sizes are loaded correctly

## Notes

- All Apple Touch Icons use **opaque backgrounds** (no transparency) as required by iOS
- Android maskable icons include **safe area padding** (15%) to prevent clipping
- SVG favicons support **dark/light mode** automatically
- Microsoft Tiles use the configured theme color as background
- All files are in the same directory: `/favicons/` for easy deployment

## Support

For issues or questions, check the documentation at your favicon generator website.
