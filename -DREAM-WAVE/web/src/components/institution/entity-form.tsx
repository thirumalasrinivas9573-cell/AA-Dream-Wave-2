"use client";

import { useState } from "react";

import { FormField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { InstitutionEntityStatus } from "@/types/institution";

const STATUS_OPTIONS: InstitutionEntityStatus[] = [
  "active",
  "inactive",
  "pending",
];

type FieldConfig =
  | {
      name: string;
      label: string;
      type?: "text" | "email" | "number" | "select" | "textarea";
      required?: boolean;
      options?: Array<{ value: string; label: string }>;
      placeholder?: string;
    };

type EntityFormProps = {
  fields: FieldConfig[];
  initialValues: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  submitLabel?: string;
};

export function EntityForm({
  fields,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: EntityFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors: Record<string, string> = {};
        for (const field of fields) {
          if (field.required && !values[field.name]?.trim()) {
            nextErrors[field.name] = `${field.label} is required`;
          }
          if (
            field.type === "email" &&
            values[field.name] &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[field.name]!)
          ) {
            nextErrors[field.name] = "Enter a valid email";
          }
        }
        if (Object.keys(nextErrors).length) {
          setErrors(nextErrors);
          return;
        }
        onSubmit(values);
      }}
      noValidate
    >
      {fields.map((field) => {
        const error = errors[field.name];
        const describedBy = error ? `${field.name}-error` : undefined;
        const controlProps = {
          id: field.name,
          required: Boolean(field.required),
          "aria-required": field.required ? true : undefined,
          "aria-invalid": Boolean(error) || undefined,
          "aria-describedby": describedBy,
        } as const;

        return (
          <FormField
            key={field.name}
            id={field.name}
            label={field.label}
            required={field.required}
            {...(error ? { error } : {})}
          >
            {field.type === "textarea" ? (
              <Textarea
                {...controlProps}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.name, event.target.value)}
              />
            ) : field.type === "select" ? (
              <select
                {...controlProps}
                className="border-input bg-background h-10 w-full rounded-lg border px-2.5 text-sm"
                value={values[field.name] ?? ""}
                onChange={(event) => setValue(field.name, event.target.value)}
              >
                {(field.options || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                {...controlProps}
                type={field.type || "text"}
                className="h-10"
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.name, event.target.value)}
              />
            )}
          </FormField>
        );
      })}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

export function statusField(): FieldConfig {
  return {
    name: "status",
    label: "Status",
    type: "select",
    options: STATUS_OPTIONS.map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
    })),
  };
}

export function selectField(
  name: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  required = false,
): FieldConfig {
  return {
    name,
    label,
    type: "select",
    required,
    options,
  };
}
