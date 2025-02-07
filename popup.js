let favorites = [];
let globalLineData = {};

document.addEventListener('DOMContentLoaded', function () {
    loadFavorites();
    fetchData('https://data.mobilites-m.fr/api/routers/default/index/routes', initializeLineData);
    addOptionsButton();
});

function fetchData(url, callback) {
    fetch(url, {
        headers: {
            'Origin': 'mon_appli' // Needed to get the right information from metromobilité api
        }
    })
    .then(response => response.json())
    .then(data => callback(data))
    .catch(error => console.error(error));
}

function initializeLineData(data) {
    data.forEach(line => {
        globalLineData[line.id] = line;
    });
    displayFavorites(); // Refresh favorites display with line styles
}

function loadFavorites() {
    const storedFavorites = localStorage.getItem('favorites');
    favorites = storedFavorites ? JSON.parse(storedFavorites) : [];
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function toggleFavorite(clusterStopId, lineId, stationName) {
    const index = favorites.findIndex(f => f.clusterStopId === clusterStopId && f.lineId === lineId);
    if (index === -1) {
        favorites.push({clusterStopId, lineId, stationName});
    } else {
        favorites.splice(index, 1);
    }
    saveFavorites();
    displayFavorites();
    updateFavoriteStar(clusterStopId, lineId);
}

function updateFavoriteStar(clusterStopId, lineId) {
    const starIcon = document.getElementById('favoriteStar');
    const isFavorite = favorites.some(f => f.clusterStopId === clusterStopId && f.lineId === lineId);
    starIcon.textContent = isFavorite ? 'star' : 'star_border';
    starIcon.classList.toggle('active', isFavorite);
}

function removeFavorite(clusterStopId, lineId) {
    favorites = favorites.filter(f => !(f.clusterStopId === clusterStopId && f.lineId === lineId));
    saveFavorites();
    displayFavorites();
}

function displayFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';

    if (favorites.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <p>Vous n'avez pas encore ajouté de favoris.</p>
            <p><a href="#" id="addFavoritesLink">Ajouter un favori maintenant</a></p>
        `;
        favoritesList.appendChild(emptyMessage);

        document.getElementById('addFavoritesLink').addEventListener('click', function() {
            window.location.href = 'options.html';
        });
    }

    favorites.forEach(favorite => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        
        const lineData = globalLineData[favorite.lineId] || {};
        const lineStyle = `background-color: #${lineData.color}; color: #${lineData.textColor};`;
        
        favoriteItem.innerHTML = `
            <div class="favorite-columns">
                <div>
                    <span class="line-name" style="${lineStyle}">${lineData.shortName || favorite.lineId}</span>
                    <span class="station-name">${favorite.stationName}</span>
                    <span class="material-icons delete-icon" style="font-size: 1rem; vertical-align: text-bottom;">delete</span>
                </div>
            </div>
            <div class="favorite-times favorite-columns"></div>
        `;

        favoriteItem.setAttribute('data-cluster-stop-id', favorite.clusterStopId);
        favoriteItem.setAttribute('data-line-id', favorite.lineId);
        favoritesList.appendChild(favoriteItem);

        fetchData(`https://data.mobilites-m.fr/api/routers/default/index/clusters/${favorite.clusterStopId}/stoptimes?route=${favorite.lineId}`, function(data) {
            const timesDiv = favoriteItem.querySelector('.favorite-times');
            timesDiv.innerHTML = ''; // Clear existing content

            const groupedTimes = {};

            data.forEach(item => {
                const direction = item.pattern.dir;
                if (!groupedTimes[direction]) {
                    groupedTimes[direction] = [];
                }
                item.times.forEach(time => {
                    time.pattern = item.pattern;
                });
                groupedTimes[direction].push(...item.times);
            });

            for (const [direction, group] of Object.entries(groupedTimes)) {
                const directionDiv = document.createElement('div');
                directionDiv.className = 'direction-info';
                
                const timesList = document.createElement('div');
                timesList.className = 'times-list';

                const currentTime = Date.now() / 1000;

                group.slice(0, 3).forEach(time => {
                    const serviceDayStart = time.serviceDay;
                    const departureInSeconds = time.realtime ? (serviceDayStart + time.realtimeDeparture) : (serviceDayStart + time.scheduledDeparture);
                    const minutesLeft = Math.floor((departureInSeconds - currentTime) / 60);

                    const formattedTime = new Date(departureInSeconds * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                    const timeString = minutesLeft >= 0 && minutesLeft < 30 
                        ? `${formattedTime} (${minutesLeft} min)` 
                        : formattedTime;

                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'time-item';
                    
                    let timeContent = `
                        <div class="time-item-lastStopName">${time.pattern.desc}</div>
                        <div class="time-item-timeString">${timeString}`;
                    
                    if (time.realtime) {
                        timeContent += `<span class="material-icons" title="En temps réel" style="font-size: 1rem; vertical-align: middle; margin-left: 4px;">rss_feed</span>`;
                    }
                    
                    timeContent += `</div>`;
                    
                    timeDiv.innerHTML = timeContent;
                    timesList.appendChild(timeDiv);
                });

                directionDiv.appendChild(timesList);
                timesDiv.appendChild(directionDiv);
            }
        });
    });

    const deleteIcons = document.querySelectorAll('.delete-icon');
    deleteIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const favoriteItem = this.closest('.favorite-item');
            const clusterStopId = favoriteItem.getAttribute('data-cluster-stop-id');
            const lineId = favoriteItem.getAttribute('data-line-id');
            removeFavorite(clusterStopId, lineId);
        });
    });
}

function addOptionsButton() {
    const optionsButton = document.createElement('button');
    optionsButton.textContent = 'Options';
    optionsButton.className = 'options-button';
    optionsButton.addEventListener('click', function() {
        window.location.href = 'options.html';
    });
    document.body.appendChild(optionsButton);
}