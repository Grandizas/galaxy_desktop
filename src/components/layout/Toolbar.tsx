import { Breadcrumbs } from '@/features/navigation/Breadcrumbs'
import { SearchField } from '@/features/search/SearchField'

/**
 * Floating chrome centred over the stage: search on top, breadcrumb trail
 * underneath. Pointer events are re-enabled per child so clicks fall through
 * to the galaxy everywhere else.
 */
export function Toolbar() {
  return (
    <>
      <div className="pointer-events-auto w-[440px]">
        <SearchField />
      </div>
      <div className="pointer-events-auto">
        <Breadcrumbs />
      </div>
    </>
  )
}
