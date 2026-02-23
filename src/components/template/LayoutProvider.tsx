import { useMemo } from 'react'
import { LayoutContext } from '@/utils/hooks/useLayout'
import { useThemeStore } from '@/store/themeStore'
import type { PropsWithChildren } from 'react'

// 👇 CORRECT IMPORT: Use 'LAYOUT_COLLAPSIBLE_SIDE' instead of 'LAYOUT_TYPE_MODERN'
import { LAYOUT_COLLAPSIBLE_SIDE } from '@/constants/theme.constant'

export const LayoutProvider = ({ children }: PropsWithChildren) => {
    // 1. Get layout from store
    const themeLayoutType = useThemeStore((state) => state.layout.type)

    // 2. FORCE FIX: If type is missing or blank, force 'Collapsible' (Standard Sidebar)
    const layoutType = themeLayoutType || LAYOUT_COLLAPSIBLE_SIDE

    const adaptiveCardActive = false

    const contextValue = useMemo(
        () => ({
            type: layoutType,
            adaptiveCardActive,
            pageContainerReassemble: undefined,
        }),
        [layoutType, adaptiveCardActive],
    )

    return (
        <LayoutContext.Provider value={contextValue}>
            {children}
        </LayoutContext.Provider>
    )
}

export default LayoutProvider
