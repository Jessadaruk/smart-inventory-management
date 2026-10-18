import { ProductForm } from "@/components/products/product-form";
export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductForm id={id} />;
}
