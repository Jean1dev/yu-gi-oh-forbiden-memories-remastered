import styles from "./collection-grid.module.css";

const SKELETON_ITEM_COUNT = 12;

/** Loading placeholder sized to the grid's own metric so the state swap never shifts the layout. */
export function GridSkeleton() {
  return (
    <ul aria-hidden="true" data-testid="library-grid-skeleton" className={styles.grid}>
      {Array.from({ length: SKELETON_ITEM_COUNT }, (_, index) => (
        <li key={index} className={styles.skeletonItem} />
      ))}
    </ul>
  );
}
