import * as vscode from "vscode";
import { filterItems } from "./filterItems";

export interface SearchableItem extends vscode.QuickPickItem {
  searchText?: string;
}

export class SearchablePickerController implements vscode.Disposable {
  private close: (() => void) | undefined;

  async show<T extends SearchableItem>(
    items: readonly T[],
    options: { title: string; placeholder: string },
  ): Promise<T | undefined> {
    this.close?.();
    const picker = vscode.window.createQuickPick<T>();
    picker.title = options.title;
    picker.placeholder = options.placeholder;
    picker.matchOnDescription = false;
    picker.matchOnDetail = false;
    picker.canSelectMany = false;

    // Keep matches in custom search fields from being filtered out by Quick Pick.
    const candidates = items.map((item) => ({ ...item, alwaysShow: true }));
    const update = (value: string) => {
      picker.items = filterItems(candidates, value);
      picker.activeItems = picker.items.length ? [picker.items[0]] : [];
    };
    update("");

    return new Promise<T | undefined>((resolve) => {
      let finished = false;
      const subscriptions: vscode.Disposable[] = [];
      const finish = (value: T | undefined) => {
        if (finished) return;
        finished = true;
        if (this.close === cancel) this.close = undefined;
        for (const subscription of subscriptions) subscription.dispose();
        picker.dispose();
        void vscode.commands.executeCommand("setContext", "projectSwitcher.quickPickVisible", false);
        resolve(value);
      };
      const cancel = () => finish(undefined);
      this.close = cancel;
      subscriptions.push(
        picker.onDidChangeValue(update),
        picker.onDidAccept(() => {
          const selected = picker.selectedItems[0] ?? picker.activeItems[0];
          if (selected) finish(selected);
        }),
        picker.onDidHide(cancel),
      );
      void vscode.commands.executeCommand("setContext", "projectSwitcher.quickPickVisible", true);
      picker.show();
    });
  }

  dispose(): void {
    this.close?.();
  }
}
