import type { ThemeConfig } from 'antd'

// Original Callgraph colors in sRGB: Ant Design derives shades with a hex/RGB color parser.
export const palette = {
  background: '#f8fafc',
  subtle: '#f1f5f9',
  border: '#e2e8f0',
  muted: '#90a1b9',
  secondary: '#62748e',
  navigation: '#45556c',
  text: '#314158',
  heading: '#0f172b',
  primary: '#4f39f6',
  primaryText: '#432dd7',
  primaryBackground: '#eef2ff',
  avatarBackground: '#e0e7ff',
  success: '#009966',
  error: '#ec003f',
}

export const fontFamily =
  "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
export const fontFamilyCode = "'JetBrains Mono', ui-monospace, SFMono-Regular, Consolas, monospace"
export const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)'

export const appTheme: ThemeConfig = {
  token: {
    fontFamily,
    fontFamilyCode,
    fontSize: 13,
    lineHeight: 1.5,
    colorPrimary: palette.primary,
    colorText: palette.text,
    colorTextHeading: palette.heading,
    colorTextSecondary: palette.secondary,
    colorBorder: palette.border,
    colorBorderSecondary: palette.subtle,
    colorBgLayout: palette.background,
    colorBgContainer: '#fff',
    borderRadius: 8,
    borderRadiusLG: 12,
    controlHeight: 36,
  },
  components: {
    Avatar: { containerSize: 32, textFontSize: 12 },
    Layout: { headerBg: '#fff', bodyBg: palette.background, headerHeight: 64 },
    Menu: {
      itemColor: palette.navigation,
      itemHoverColor: palette.heading,
      itemHoverBg: palette.background,
      itemSelectedColor: palette.primaryText,
      itemSelectedBg: palette.primaryBackground,
      itemHeight: 40,
      itemMarginInline: 0,
      itemMarginBlock: 0,
      itemBorderRadius: 8,
      iconSize: 16,
      iconMarginInlineEnd: 12,
      activeBarWidth: 0,
    },
    Button: {
      defaultColor: palette.text,
      defaultBorderColor: palette.border,
      defaultHoverColor: palette.text,
      defaultHoverBorderColor: palette.border,
      defaultHoverBg: palette.background,
      defaultShadow: cardShadow,
      colorText: palette.secondary,
      textHoverBg: palette.subtle,
      paddingInline: 12,
    },
    Card: { bodyPadding: 16 },
    Table: {
      headerBg: palette.background,
      headerColor: palette.secondary,
      borderColor: palette.subtle,
      rowHoverBg: palette.background,
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      headerSplitColor: 'transparent',
    },
  },
}
