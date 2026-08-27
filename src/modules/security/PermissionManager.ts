import { DomainPermissionSetting } from '../../core/types/agent';

export class PermissionManager {
  private static DANGEROUS_KEYWORDS = [
    'delete', 'hapus', 'checkout', 'bayar', 'publish', 'transfer', 'confirm', 'pay', 'remove', 'buy'
  ];

  public static async getDomainPermission(domain: string): Promise<'auto' | 'approval'> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return 'approval';
    }

    return new Promise((resolve) => {
      chrome.storage.local.get(['site_permissions'], (res) => {
        const permissions: DomainPermissionSetting[] = Array.isArray(res?.site_permissions) ? res.site_permissions : [];
        const found = permissions.find((p) => p.domain === domain);
        resolve(found ? found.mode : 'approval');
      });
    });
  }

  public static async setDomainPermission(domain: string, mode: 'auto' | 'approval'): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['site_permissions'], (res) => {
      const permissions: DomainPermissionSetting[] = Array.isArray(res?.site_permissions) ? res.site_permissions : [];
      const index = permissions.findIndex((p) => p.domain === domain);

      if (index !== -1) {
        permissions[index].mode = mode;
      } else {
        permissions.push({ domain, mode });
      }

      chrome.storage.local.set({ site_permissions: permissions });
    });
  }

  public static isDangerousAction(actionDescription: string, paramsText?: string): boolean {
    const textToCheck = `${actionDescription} ${paramsText || ''}`.toLowerCase();
    return this.DANGEROUS_KEYWORDS.some((kw) => textToCheck.includes(kw));
  }
}
