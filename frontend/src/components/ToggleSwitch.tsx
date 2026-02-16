import { useState } from "react";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth";

interface ToggleSwitchProps {
  repoId: string;
  initialChecked?: boolean;
}

export default function ToggleSwitch({ repoId, initialChecked = true }: ToggleSwitchProps) {
  const [checked, setChecked] = useState(initialChecked);

  const handleChange = async () => {
    const previousState = checked;
    setChecked(!checked);

    try {
      const response = await authFetch(`${API_BASE_URL}/api/users/data/github/toggleReview/${repoId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle (${response.status})`);
      }

      toast.success(
        !previousState ? "Reviews enabled" : "Reviews disabled",
        { description: "Auto-review setting updated for this repository." }
      );
    } catch (error) {
      setChecked(previousState); // revert on failure
      toast.error("Failed to update review setting", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <label className="inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={handleChange}
      />
      <div
        className={`relative w-11 h-6 rounded-full
          transition-colors
          ${checked ? "bg-blue-600" : "bg-gray-700"}
          peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800
          after:content-[''] after:absolute after:top-0.5 after:left-[2px]
          after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5
          after:transition-all
          ${checked ? "after:translate-x-full after:border-white" : ""}
        `}
      ></div>
    </label>
  );
}
