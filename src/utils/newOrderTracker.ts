// Keep IDs for the entire login session, including orders that leave the API window.
export class NewOrderTracker {
  private initialized = false;
  private seen = new Set<string>();

  observe(ids: readonly string[], eligibleIds: readonly string[] = ids): boolean {
    const hasNewOrder = this.initialized && eligibleIds.some((id) => !this.seen.has(id));
    for (const id of ids) this.seen.add(id);
    this.initialized = true;
    return hasNewOrder;
  }

  reset() {
    this.initialized = false;
    this.seen.clear();
  }
}
