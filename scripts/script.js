document.getElementById('searchForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const frequency = parseFloat(document.getElementById('frequency').value);
    const decibel = parseFloat(document.getElementById('decibel').value);

    fetch('phone_book.json')
        .then(response => response.json())
        .then(phoneBook => {
            const iemList = phoneBook;

            const promises = iemList.map(iem => {
                return fetch(`audio_db/${iem.id}.json`)
                    .then(response => response.json())
                    .then(measurementData => {
                        return {
                            name: iem.name,
                            measurements: measurementData
                        };
                    });
            });

            Promise.all(promises).then(data => {
                const results = data.filter(item => {
                    return item.measurements.some(measurement => 
                        measurement.frequency === frequency && measurement.decibel === decibel
                    );
                });
                displayResults(results);
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});

function displayResults(results) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    if (results.length > 0) {
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.textContent = `IEM: ${result.name}`;
            resultDiv.appendChild(resultItem);
        });
    } else {
        resultDiv.textContent = 'No results found.';
    }
}
