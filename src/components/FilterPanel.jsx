import { Filter } from 'lucide-react';

export default function FilterPanel({ 
  projects, 
  selectedCategory, 
  setSelectedCategory, 
  searchTag, 
  setSearchTag 
}) {
  // Extract unique categories from projects
  const categories = [...new Set(projects.map(project => project.category))];
  
  // Extract unique tags from all projects
  const allTags = new Set();
  projects.forEach(project => {
    if (project.tags && project.tags.length > 0) {
      project.tags.forEach(tag => allTags.add(tag));
    }
  });
  const uniqueTags = [...allTags];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Filter size={20} className="text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
      </div>
      
      {/* Category Filter */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-700 mb-3">Category</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
            <input 
              type="radio" 
              name="category" 
              value="" 
              checked={selectedCategory === ''} 
              onChange={() => setSelectedCategory('')}
              className="text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">All Categories</span>
          </label>
          {categories.map(category => (
            <label 
              key={category} 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
            >
              <input 
                type="radio" 
                name="category" 
                value={category} 
                checked={selectedCategory === category} 
                onChange={() => setSelectedCategory(category)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tag Filter */}
      <div>
        <h3 className="font-medium text-gray-700 mb-3">Filter by Tag</h3>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Search tags..."
          value={searchTag}
          onChange={e => setSearchTag(e.target.value)}
        />
        
        {uniqueTags.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">Available tags:</p>
            <div className="flex flex-wrap gap-1">
              {uniqueTags
                .filter(tag => tag.toLowerCase().includes(searchTag.toLowerCase()))
                .slice(0, 10) // Show max 10 tags
                .map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearchTag(tag)}
                    className="inline-block bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-2 py-1 rounded text-xs transition-colors"
                  >
                    {tag}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}