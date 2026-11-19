import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faPaperPlane, faChartSimple, faTrophy } from '@fortawesome/free-solid-svg-icons';
import CustomSelect from '../CustomSelect';

export default function PostFilters({ filter, setFilter, sort, setSort }) {
    return (
        <div className="feed-filters">
            <div className="feed-filter-tabs" role="group" aria-label="Тип дописів">
                {[
                    ['all', 'Усі дописи', faLayerGroup],
                    ['update', 'Оновлення', faPaperPlane],
                    ['report', 'Звіти', faChartSimple],
                    ['achievement', 'Досягнення', faTrophy],
                ].map(([value, label, icon]) => (
                    <button key={value} type="button" className={`feed-filter-tab ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)} aria-pressed={filter === value}>
                        <FontAwesomeIcon icon={icon} /> {label}
                    </button>
                ))}
            </div>
            <div className="feed-sort">
                <CustomSelect
                    value={sort}
                    onChange={setSort}
                    placeholder="Сортування дописів"
                    options={[
                        { value: 'new', label: 'Спочатку нові' },
                        { value: 'old', label: 'Спочатку старі' },
                    ]}
                />
            </div>
        </div>

    );
}