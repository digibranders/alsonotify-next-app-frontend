import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Checkbox } from 'antd';
import { ChecklistItem, createEmptyChecklistItem } from '../../types/notes';

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  placeholder?: string;
  className?: string;
}

export function ChecklistEditor({ items, onChange, placeholder = "List", className = "" }: ChecklistEditorProps) {
  const [localItems, setLocalItems] = useState<ChecklistItem[]>(items.length > 0 ? items : [createEmptyChecklistItem(0)]);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external items - convert from backend format if needed
  useEffect(() => {
    if (items && items.length > 0) {
      // Ensure all items are in ChecklistItem format
      const convertedItems: ChecklistItem[] = items.map((item: Partial<ChecklistItem> & { checked?: boolean }, index: number): ChecklistItem => {
        if (item.id && typeof item.isChecked === 'boolean' && item.order !== undefined) {
          return item as ChecklistItem;
        } else {
          return {
            id: item.id || `item-${Date.now()}-${index}`,
            text: item.text || '',
            isChecked: item.checked !== undefined ? item.checked : (item.isChecked || false),
            order: item.order !== undefined ? item.order : index,
            indentLevel: item.indentLevel || 0,
            parentId: item.parentId || null,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          };
        }
      });

      // Optimization: Only update if content is different logic to prevent loops
      // We check for length, IDs, text, checked status, order, and indent
      const isDifferent = convertedItems.length !== localItems.length ||
        convertedItems.some((cItem, i) => {
          const lItem = localItems[i];
          return cItem.id !== lItem.id ||
            cItem.text !== lItem.text ||
            cItem.isChecked !== lItem.isChecked ||
            cItem.order !== lItem.order ||
            cItem.indentLevel !== lItem.indentLevel;
        });

      if (isDifferent) {
        setLocalItems(convertedItems);
      }
    } else if (localItems.length === 0) {
      // Only set empty if we are supposedly empty but have 0 items (which shouldn't happen if we default to 1)
      // Actually we default to 1 empty item.
      // If items prop is [], we might want to respect that? Or default to 1?
      // Existing logic enforced 1 item.
      // We just keep existing logic but wrapped in check
      setLocalItems([createEmptyChecklistItem(0)]);
    }
    // Deps intentionally [items] only; including localItems would cause sync loop with parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Notify parent of changes (debounced to avoid excessive updates)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onChange(localItems);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [localItems, onChange]);

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setLocalItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    ));
  };

  const addItem = (afterIndex: number, text: string = '') => {
    const newItem = createEmptyChecklistItem(afterIndex + 1, 0);
    newItem.text = text;

    setLocalItems(prev => {
      const newItems = [...prev];
      // Update order of items after insertion point
      newItems.forEach((item, idx) => {
        if (idx > afterIndex) {
          item.order = idx + 1;
        }
      });
      newItems.splice(afterIndex + 1, 0, newItem);
      return newItems;
    });

    // Focus the new item
    setTimeout(() => {
      const input = inputRefs.current[newItem.id];
      if (input) {
        input.focus();
        input.setSelectionRange(0, 0);
      }
    }, 0);
  };

  const removeItem = (index: number) => {
    if (localItems.length === 1) {
      // Keep at least one empty item
      setLocalItems([createEmptyChecklistItem(0)]);
      setTimeout(() => {
        const input = inputRefs.current[localItems[0].id];
        if (input) input.focus();
      }, 0);
      return;
    }

    setLocalItems(prev => {
      const newItems = prev.filter((_, idx) => idx !== index);
      // Reorder remaining items
      newItems.forEach((item, idx) => {
        item.order = idx;
      });
      return newItems;
    });

    // Focus previous item
    if (index > 0) {
      setTimeout(() => {
        const prevItem = localItems[index - 1];
        const input = inputRefs.current[prevItem.id];
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, item: ChecklistItem, index: number) => {
    const input = e.currentTarget;
    const cursorPos = input.selectionStart || 0;
    const textLength = input.value.length;

    if (e.key === 'Enter') {
      e.preventDefault();

      if (cursorPos === 0 && input.value.trim() === '') {
        // Enter on empty item: remove if not only item
        if (localItems.length > 1) {
          removeItem(index);
        }
        return;
      }

      if (cursorPos < textLength) {
        // Split item at cursor
        const beforeText = input.value.substring(0, cursorPos);
        const afterText = input.value.substring(cursorPos);

        updateItem(item.id, { text: beforeText });
        addItem(index, afterText);
      } else {
        // Enter at end: create new item
        if (input.value.trim() !== '') {
          addItem(index);
        }
      }
    } else if (e.key === 'Backspace') {
      if (cursorPos === 0 && input.value === '') {
        e.preventDefault();

        if (item.indentLevel > 0) {
          // Dedent instead of delete
          updateItem(item.id, { indentLevel: Math.max(0, item.indentLevel - 1) });
        } else if (localItems.length > 1) {
          // Remove item
          removeItem(index);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: dedent
        if (item.indentLevel > 0) {
          updateItem(item.id, { indentLevel: item.indentLevel - 1 });
        }
      } else {
        // Tab: indent (only if previous item exists)
        if (index > 0) {
          const prevItem = localItems[index - 1];
          // Can indent at most one level deeper than previous item
          const maxIndent = prevItem.indentLevel + 1;
          if (item.indentLevel < maxIndent) {
            updateItem(item.id, { indentLevel: item.indentLevel + 1 });
          }
        }
        // First item (index 0) cannot be indented
      }
    }
  };

  const handleToggleCheck = (item: ChecklistItem) => {
    updateItem(item.id, { isChecked: !item.isChecked });
  };

  // Separate checked and unchecked items
  const uncheckedItems = localItems.filter(item => !item.isChecked).sort((a, b) => a.order - b.order);
  const checkedItems = localItems.filter(item => item.isChecked).sort((a, b) => a.order - b.order);

  return (
    <div
      ref={containerRef}
      className={`checklist-editor ${className}`}
      style={{
        minHeight: '200px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Unchecked Items */}
      <div className="space-y-1">
        {uncheckedItems.map((item, displayIndex) => {
          const actualIndex = localItems.findIndex(i => i.id === item.id);
          return (
            <div
              key={item.id}
              className="flex items-start gap-2"
              style={{ paddingLeft: `${item.indentLevel * 24}px` }}
            >
              <Checkbox
                checked={item.isChecked}
                onChange={() => handleToggleCheck(item)}
                className="mt-1.5 flex-shrink-0"
              />
              <input
                ref={(el) => { inputRefs.current[item.id] = el; }}
                type="text"
                value={item.text}
                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, item, actualIndex)}
                placeholder={displayIndex === 0 && item.text === '' ? placeholder : ''}
                className="flex-1 border-none outline-none bg-transparent font-['Manrope:Regular',sans-serif] text-[14px] text-[#111111] placeholder:text-[#999]"
                style={{ padding: '4px 0' }}
              />
            </div>
          );
        })}
      </div>

      {/* Checked Items Section */}
      {checkedItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#EEEEEE]">
          <div className="text-[11px] font-['Manrope:Medium',sans-serif] text-[#999] mb-2 uppercase">
            Completed
          </div>
          <div className="space-y-1">
            {checkedItems.map((item) => {
              const actualIndex = localItems.findIndex(i => i.id === item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2 opacity-60"
                  style={{ paddingLeft: `${item.indentLevel * 24}px` }}
                >
                  <Checkbox
                    checked={item.isChecked}
                    onChange={() => handleToggleCheck(item)}
                    className="mt-1.5 flex-shrink-0"
                  />
                  <input
                    ref={(el) => { inputRefs.current[item.id] = el; }}
                    type="text"
                    value={item.text}
                    onChange={(e) => updateItem(item.id, { text: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, item, actualIndex)}
                    className="flex-1 border-none outline-none bg-transparent font-['Manrope:Regular',sans-serif] text-[14px] text-[#666666] line-through"
                    style={{ padding: '4px 0' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
