import styles from "./collection-panel.module.css";

const SKELETON_ITEM_COUNT = 6;

/** Loading placeholder sized to the real item's metric so the state swap never shifts the layout. */
export function PanelSkeleton() {
  return (
    <ul aria-hidden="true" data-testid="collection-panel-skeleton" className={styles.skeletonList}>
      {Array.from({ length: SKELETON_ITEM_COUNT }, (_, index) => (
        <li key={index} className={styles.skeletonItem} />
      ))}
    </ul>
  );
}
