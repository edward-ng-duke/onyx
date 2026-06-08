"use client";

import { useState, useEffect } from "react";
import { Button } from "@opal/components";
import { Badge } from "@/components/ui/badge";
import { FilterComponent, FilterOptions } from "./FilterComponent";
import { InputTypeIn } from "@opal/components";
import { useTranslations } from "next-intl";

interface SearchAndFilterControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hasExpandedSources: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  filterOptions: FilterOptions;
  onFilterChange: (filterOptions: FilterOptions) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  filterComponentRef: React.RefObject<{ resetFilters: () => void }>;
  resetPagination: () => void;
}

export function SearchAndFilterControls({
  searchQuery,
  onSearchChange,
  hasExpandedSources,
  onExpandAll,
  onCollapseAll,
  filterOptions,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  filterComponentRef,
  resetPagination,
}: SearchAndFilterControlsProps) {
  const [localSearchValue, setLocalSearchValue] = useState(searchQuery);
  const t = useTranslations("admin.indexing.status");

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      resetPagination();
      onSearchChange(localSearchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchValue, onSearchChange, resetPagination]);

  // Sync with external searchQuery changes (e.g., when filters are cleared)
  useEffect(() => {
    setLocalSearchValue(searchQuery);
  }, [searchQuery]);

  return (
    <div className="flex items-center gap-x-2">
      <InputTypeIn
        placeholder={t("searchConnectorsPlaceholder")}
        type="text"
        value={localSearchValue}
        onChange={(event) => setLocalSearchValue(event.target.value)}
      />

      <Button onClick={hasExpandedSources ? onCollapseAll : onExpandAll}>
        {hasExpandedSources ? t("collapseAll") : t("expandAll")}
      </Button>

      <div className="flex items-center gap-2">
        <FilterComponent
          onFilterChange={onFilterChange}
          ref={filterComponentRef}
        />

        {hasActiveFilters && (
          <div className="flex flex-none items-center gap-1 ml-2 max-w-[500px]">
            {filterOptions.accessType &&
              filterOptions.accessType.length > 0 && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                  {t("filterAccessLabel", {
                    value: filterOptions.accessType.join(", "),
                  })}
                </Badge>
              )}

            {filterOptions.lastStatus &&
              filterOptions.lastStatus.length > 0 && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                  {t("filterStatusLabel", {
                    value: filterOptions.lastStatus
                      .map((s) => s.replace(/_/g, " "))
                      .join(", "),
                  })}
                </Badge>
              )}

            {filterOptions.docsCountFilter.operator &&
              filterOptions.docsCountFilter.value !== null && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                  {t("filterDocsCountLabel", {
                    operator: filterOptions.docsCountFilter.operator,
                    value: filterOptions.docsCountFilter.value,
                  })}
                </Badge>
              )}

            {filterOptions.docsCountFilter.operator &&
              filterOptions.docsCountFilter.value === null && (
                <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                  {t("filterDocsAnyLabel", {
                    operator: filterOptions.docsCountFilter.operator,
                  })}
                </Badge>
              )}

            <Badge
              variant="outline"
              className="px-2 py-0.5 text-xs border-red-400  bg-red-100 hover:border-red-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
              onClick={onClearFilters}
            >
              <span className="text-red-500 dark:text-red-400">
                {t("clearFilters")}
              </span>
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
