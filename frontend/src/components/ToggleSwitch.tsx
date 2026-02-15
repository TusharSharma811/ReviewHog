import { useState } from "react";

export default function ToggleSwitch({ repoId }: { repoId: string }) {
  const [checked, setChecked] = useState(true);

  const handleChange = () => {
    const fetchData = async () => {
      try {
        await fetch(`https://vulture-needed-immensely.ngrok-free.app/api/users/data/github/toggleReview/${repoId}`, {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
    setChecked(!checked);
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
