'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Plus, Package, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  Loader2, X, Upload,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/Badge';
import { BrandedLoader } from '@/components/ui/BrandedLoader';

type Product = {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  priceAmount: string | null;
  currency: string | null;
  stockCount: number;
  imageUrl: string | null;
  images: unknown;
  isPublished: boolean;
  isBuyAndTryEligible: boolean;
  sortOrder: number;
};

export default function TenantProductsPage() {
  const list = trpc.products.listMine.useQuery();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creatingForShop, setCreatingForShop] = useState<string | null>(null);

  // Group by shop so multiple-shop tenants can manage each independently.
  const byShop = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of (list.data ?? []) as Product[]) {
      if (!map.has(p.shopId)) map.set(p.shopId, []);
      map.get(p.shopId)!.push(p);
    }
    return map;
  }, [list.data]);

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-400 mb-1.5">Tenant Hub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Products</h1>
          <p className="text-sm text-ink-500 mt-1">Catalog items shown on your storefront and available for Buy &amp; Try.</p>
        </div>
      </header>

      {list.isLoading ? (
        <div className="card p-12 flex justify-center">
          <BrandedLoader size="md" label="Loading products…" />
        </div>
      ) : byShop.size === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-7 h-7 mx-auto text-ink-300 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-ink-700 mb-1">No products yet</p>
          <p className="text-xs text-ink-500">You&apos;ll see your catalog here once your shop is assigned by the building manager.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byShop.entries()).map(([shopId, items]) => (
            <ShopProductSection
              key={shopId}
              shopId={shopId}
              items={items}
              onEdit={setEditing}
              onCreate={() => setCreatingForShop(shopId)}
              onRefresh={() => list.refetch()}
            />
          ))}
        </div>
      )}

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); list.refetch(); }}
        />
      )}
      {creatingForShop && (
        <ProductEditor
          newForShopId={creatingForShop}
          onClose={() => setCreatingForShop(null)}
          onSaved={() => { setCreatingForShop(null); list.refetch(); }}
        />
      )}
    </div>
  );
}

function ShopProductSection({
  shopId, items, onEdit, onCreate, onRefresh,
}: {
  shopId: string;
  items: Product[];
  onEdit: (p: Product) => void;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  const sorted = useMemo(() => [...items].sort((a, b) => a.sortOrder - b.sortOrder), [items]);
  const reorder = trpc.products.reorder.useMutation({ onSuccess: () => onRefresh() });
  const update  = trpc.products.update.useMutation({ onSuccess: () => onRefresh() });
  const remove  = trpc.products.delete.useMutation({ onSuccess: () => onRefresh() });

  function move(index: number, delta: 1 | -1) {
    const target = index + delta;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate({ shopId, orderedIds: next.map((p) => p.id) });
  }

  return (
    <section className="card overflow-hidden">
      <div className="card-header py-3 px-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Shop products</h2>
        <button onClick={onCreate} className="btn-primary text-xs py-1.5 px-3">
          <Plus className="w-3 h-3" /> Add product
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-mono uppercase tracking-[0.16em] text-ink-400 border-b border-ink-100">
            <th className="px-5 py-2.5 font-semibold">Product</th>
            <th className="px-3 py-2.5 font-semibold text-right">Price</th>
            <th className="px-3 py-2.5 font-semibold text-right">Stock</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr
              key={p.id}
              onClick={() => onEdit(p)}
              className="border-b border-ink-50 hover:bg-ink-50/60 transition-colors cursor-pointer"
              title="Click to view stock, price, and details"
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-ink-100 overflow-hidden flex-shrink-0 relative">
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                    {p.category && <p className="text-xs text-ink-500">{p.category}</p>}
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-right tabular-nums font-medium text-ink-900">
                {p.priceAmount ? `${Number(p.priceAmount).toLocaleString('en-RW')} ${p.currency}` : '—'}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-ink-700">{p.stockCount}</td>
              <td className="px-3 py-3">
                {p.isPublished
                  ? <Badge variant="green">Published</Badge>
                  : <Badge variant="gray">Draft</Badge>}
              </td>
              <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="inline-flex items-center gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0 || reorder.isPending}
                    className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-500 disabled:opacity-30"
                    aria-label="Move up">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === sorted.length - 1 || reorder.isPending}
                    className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-500 disabled:opacity-30"
                    aria-label="Move down">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => update.mutate({ id: p.id, isPublished: !p.isPublished })}
                    disabled={update.isPending}
                    className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-500"
                    title={p.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {p.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => onEdit(p)}
                    className="w-7 h-7 rounded-md hover:bg-ink-100 flex items-center justify-center text-primary-700"
                    aria-label="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${p.name}"?`)) remove.mutate({ id: p.id }); }}
                    disabled={remove.isPending}
                    className="w-7 h-7 rounded-md hover:bg-danger-50 flex items-center justify-center text-danger-700"
                    aria-label="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-500">No products in this shop yet.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function ProductEditor({
  product, newForShopId, onClose, onSaved,
}: {
  product?: Product;
  newForShopId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !product;
  const [name, setName]               = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [category, setCategory]       = useState(product?.category ?? '');
  const [price, setPrice]             = useState(product?.priceAmount ?? '');
  const [stock, setStock]             = useState(product?.stockCount?.toString() ?? '0');
  const [imageUrl, setImageUrl]       = useState(product?.imageUrl ?? '');
  const [published, setPublished]     = useState(product?.isPublished ?? false);
  const [buyTry, setBuyTry]           = useState(product?.isBuyAndTryEligible ?? true);
  const [uploading, setUploading]     = useState(false);
  const [err, setErr]                 = useState<string | null>(null);

  const create = trpc.products.create.useMutation({
    onSuccess: () => onSaved(),
    onError: (e) => setErr(e.message),
  });
  const update = trpc.products.update.useMutation({
    onSuccess: () => onSaved(),
    onError: (e) => setErr(e.message),
  });
  const uploadImage = trpc.media.uploadProductImage.useMutation();

  async function pickImage(file: File) {
    if (!product) {
      setErr('Save the product first, then upload an image.');
      return;
    }
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    setErr(null);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8, maxWidthOrHeight: 1400, useWebWorker: true, fileType: 'image/jpeg',
      });
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]!);
        r.onerror = rej;
        r.readAsDataURL(compressed);
      });
      const result = await uploadImage.mutateAsync({
        productId: product.id,
        fileBase64: base64,
        mimeType: 'image/jpeg',
      });
      setImageUrl(result.url);
    } catch (e) {
      setErr((e as Error).message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setErr(null);
    const priceAmount = Number(price);
    if (!name.trim() || Number.isNaN(priceAmount) || priceAmount < 0) {
      setErr('Name and a valid price are required.');
      return;
    }
    const stockCount = Math.max(0, parseInt(stock, 10) || 0);

    if (isNew && newForShopId) {
      create.mutate({
        shopId: newForShopId,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        priceAmount,
        stockCount,
        isPublished: published,
        isBuyAndTryEligible: buyTry,
      });
    } else if (product) {
      update.mutate({
        id: product.id,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        priceAmount,
        stockCount,
        imageUrl: imageUrl || undefined,
        isPublished: published,
        isBuyAndTryEligible: buyTry,
      });
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900 tracking-tight">
            {isNew ? 'New product' : 'Edit product'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field label="Name" required>
            <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </Field>
          <Field label="Description">
            <textarea className="input-base min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input className="input-base" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={100} />
            </Field>
            <Field label="Price (RWF)" required>
              <input type="number" className="input-base" value={price} onChange={(e) => setPrice(e.target.value)} min={0} />
            </Field>
          </div>
          <Field label="Stock count">
            <input type="number" className="input-base" value={stock} onChange={(e) => setStock(e.target.value)} min={0} />
          </Field>

          {product && (
            <Field label="Image">
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-ink-100 relative flex-shrink-0">
                    <Image src={imageUrl} alt="Product" fill className="object-cover" sizes="80px" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-ink-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-ink-300" strokeWidth={1.5} />
                  </div>
                )}
                <label className="btn-secondary text-xs py-1.5 cursor-pointer">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Upload
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); }}
                  />
                </label>
              </div>
            </Field>
          )}

          <div className="flex items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span className="text-ink-700">Published</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={buyTry} onChange={(e) => setBuyTry(e.target.checked)} />
              <span className="text-ink-700">Buy &amp; Try eligible</span>
            </label>
          </div>

          {err && <p className="text-xs text-danger-700">{err}</p>}
        </div>
        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900 px-3 py-1.5">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-primary text-sm py-1.5">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {isNew ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-1">
        {label}{required && <span className="text-danger-700 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
