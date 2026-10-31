import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useApiMutation, useList, useRecord } from './factory';

export const productKeys = {
  list: (params) => ['products', params],
  detail: (id) => ['product', id],
};

/** Product with variants and taxes, from the cache when fresh (used by the lines editor). */
export function fetchProduct(id) {
  return queryClient.fetchQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
    staleTime: 60_000,
  });
}

export const useProducts = (params) => useList('products', '/products', params);
export const useProduct = (id, options) => useRecord('product', '/products', id, { staleTime: 60_000, ...options });

const touched = (id) => [['products'], ['product', id], ['combobox', 'products']];

export function useCreateProduct() {
  return useApiMutation({
    mutationFn: (body) => api.post('/products', body).then((r) => r.data),
    invalidate: [['products'], ['combobox', 'products']],
    success: (p) => `${p.name} created`,
    manualError: true,
  });
}

export function useUpdateProduct(id) {
  return useApiMutation({
    mutationFn: (body) => api.patch(`/products/${id}`, body).then((r) => r.data),
    invalidate: touched(id),
    success: 'Product saved',
    manualError: true,
  });
}

export function useArchiveProduct(id) {
  return useApiMutation({
    mutationFn: () => api.delete(`/products/${id}`).then((r) => r.data),
    invalidate: touched(id),
    success: 'Product archived',
  });
}

export function useSetProductTaxes(id) {
  return useApiMutation({
    mutationFn: (taxIds) => api.put(`/products/${id}/taxes`, { taxIds }).then((r) => r.data),
    invalidate: touched(id),
    success: 'Taxes saved',
  });
}

export function useCreateVariant(id) {
  return useApiMutation({
    mutationFn: (body) => api.post(`/products/${id}/variants`, body).then((r) => r.data),
    invalidate: touched(id),
    success: (v) => `Variant ${v.name} added`,
  });
}

export function useUpdateVariant(id) {
  return useApiMutation({
    mutationFn: ({ variantId, ...body }) => api.patch(`/products/${id}/variants/${variantId}`, body).then((r) => r.data),
    invalidate: touched(id),
    success: 'Variant updated',
  });
}
