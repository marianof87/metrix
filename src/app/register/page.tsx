import type { Metadata } from "next";
import RegisterForm from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta · metrix",
  description: "Regístrate en metrix",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-xl font-bold tracking-tight text-zinc-900">
        Crear cuenta
      </h1>
      <RegisterForm />
    </div>
  );
}
