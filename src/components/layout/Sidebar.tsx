import { Panel } from '@/components/ui/Panel'
import { ListItem } from '@/components/ui/ListItem'
import { useNavigationSections } from '@/features/navigation/useNavigationSections'
import { cn } from '@/utils/cn'

/** Left rail: favourites, well-known folders and drives. */
export function Sidebar() {
  const sections = useNavigationSections()

  return (
    <Panel className="h-full" padded>
      <div className="flex flex-col gap-5 pt-3">
        {sections.map((section) => (
          <section key={section.title}>
            <h3 className="px-2.5 pb-2 font-mono text-[9px] tracking-[0.22em] text-content-subtle uppercase">
              {section.title}
            </h3>

            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <ListItem
                  key={item.id}
                  active={item.active}
                  onClick={item.onSelect}
                  icon={
                    <span
                      className={cn(
                        'size-2.5 shrink-0 border-[1.5px]',
                        item.shape === 'drive' && 'rounded-[2px]',
                        item.shape === 'network' && 'rounded-full',
                        item.shape === 'favorite' && 'rotate-45 rounded-[1px]',
                        item.shape === 'folder' && 'rounded-[50%_50%_50%_2px]',
                      )}
                      style={{ borderColor: item.accent }}
                    />
                  }
                >
                  {item.label}
                </ListItem>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  )
}
