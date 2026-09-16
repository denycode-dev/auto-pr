import { SopDualPaneEditor } from "../_components/sop-dual-pane-editor";

export const metadata = {
  title: "Tulis Coding SOP Baru | Qodeer Review",
  description: "Editor panduan standar kualitas kode dan kepatuhan tim",
};

export default function CreateSopPage() {
  return <SopDualPaneEditor mode="create" />;
}
