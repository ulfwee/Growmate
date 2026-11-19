import React from 'react';
import { TABS } from './taskUtils';
import CustomSelect from '../CustomSelect';

export default function TaskFilters({ tab, onTabChange, search, onSearchChange, goalFilter, onGoalFilterChange, goals }) {
  const options = [
    { value: 'all', label: 'Усі цілі' }, { value: 'none', label: 'Без цілі' },
    { value: 'group', label: 'Групові цілі' },
    ...goals.map(goal => ({ value: String(goal.id), label: goal.title })),
  ];

  return (
    <>
      <div className="tasks-toolbar">
        <div className="tasks-tabs">
          {TABS.map(item => (
            <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => onTabChange(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="tasks-search">
          <input type="search" value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Пошук завдань..." aria-label="Пошук завдань" />
        </div>
      </div>
      <div className="tasks-filters">
        <div className="tasks-goal-filter">
          <CustomSelect value={String(goalFilter)} onChange={onGoalFilterChange} options={options} placeholder="Фільтр за ціллю" />
        </div>
      </div>
    </>
  );
}