import { routes } from './app.routes';

describe('routes', () => {
  it('define el grupo "product" con los children create y edit/:id', () => {
    const productGroup = routes.find(r => r.path === 'product' && r.children);

    expect(productGroup).toBeTruthy();

    const childPaths = productGroup?.children?.map(c => c.path) ?? [];
    expect(childPaths).toContain('create');
    expect(childPaths).toContain('edit/:id');
  });

  it('define la ruta product/:id DESPUÉS del grupo "product" (regresión de bug de orden de rutas)', () => {
    const productGroupIndex = routes.findIndex(r => r.path === 'product' && r.children);
    const productDetailIndex = routes.findIndex(r => r.path === 'product/:id');

    expect(productGroupIndex).toBeGreaterThanOrEqual(0);
    expect(productDetailIndex).toBeGreaterThanOrEqual(0);
    expect(productDetailIndex).toBeGreaterThan(productGroupIndex);
  });

  it('protege las rutas de moderador y admin con roleGuard y los roles esperados', () => {
    const moderatorGroup = routes.find(r => r.path === 'moderator');
    const adminGroup = routes.find(r => r.path === 'admin');

    expect(moderatorGroup?.data?.['roles']).toEqual(['moderator', 'administrator']);
    expect(adminGroup?.data?.['roles']).toEqual(['administrator']);
  });

  it('define una ruta wildcard final para 404', () => {
    expect(routes[routes.length - 1].path).toBe('**');
  });
});
