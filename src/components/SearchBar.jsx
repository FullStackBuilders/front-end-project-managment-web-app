import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function SearchBar({ searchTerm, setSearchTerm }) {
  return (
    <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white shadow-sm w-full max-w-sm">
      <Search className="text-gray-400" size={18} />
      <Input
        type="text"
        placeholder="Search projects by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border-none focus:ring-0 focus:outline-none text-sm"
      />
    </div>
  );
}