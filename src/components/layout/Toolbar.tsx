import { Breadcrumbs } from '@/features/navigation/Breadcrumbs'
import { SearchField } from '@/features/search/SearchField'
import { SearchResults } from '@/features/search/SearchResults'

/**
 * Floating chrome centred over the stage: search on top, its results directly
 * beneath, then the breadcrumb trail. Pointer events are re-enabled per child
 * so clicks fall through to the galaxy everywhere else.
 */
export function Toolbar() {
  return (
    <>
      <div className="pointer-events-auto w-[440px]">
        <SearchField />
      </div>
      <SearchResults />
      <div className="pointer-events-auto">
        <Breadcrumbs />
      </div>
    </>
  )
}
