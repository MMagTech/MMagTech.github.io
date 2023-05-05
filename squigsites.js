let mode = 'prod';

function loadJquery() {
    let body = document.querySelector('body'),
        scriptJquery = document.createElement('script'),
        hostedJquery = 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js';
    
    scriptJquery.setAttribute('type', 'text/javascript');
    scriptJquery.setAttribute('src', hostedJquery);
    scriptJquery.addEventListener('load', function() {
        createSquigSelect();
        initDbExplorer();
    });
    
    body.append(scriptJquery);
}
loadJquery();

function createSquigSelect() {
    let squigsitesJson = mode === 'dev' ? 'squigsites.json' : 'https://fr.mmagtech.com/squigsites.json',
        squigSelect = document.createElement('select'),
        squigSelectBlank = document.createElement('option'),
        squigSelectGroupIems = document.createElement('optgroup'),
        squigSelectGroupHeadphones = document.createElement('optgroup'),
        squigSelectGroupEarbuds = document.createElement('optgroup'),
        newLi = document.createElement('li'),
        headerLinksUl = document.querySelector('ul.header-links'),
        currentSite = window.location.host.split('.')[2] ? window.location.host.split('.')[0] : 'superreview',
        currentDb = window.location.pathname;
    
    newLi.className = 'squig-select-li';
    squigSelect.className = 'squig-select';
    squigSelect.addEventListener('change', squigsiteChange);
    
    squigSelectBlank.setAttribute('disabled','');
    squigSelectBlank.setAttribute('selected','');
    squigSelectBlank.setAttribute('value','');
    squigSelectBlank.textContent = 'More squiglinks';
    squigSelect.append(squigSelectBlank);
    
    squigSelectGroupIems.setAttribute('label', 'IEMs');
    squigSelectGroupHeadphones.setAttribute('label', 'Headphones');
    squigSelectGroupEarbuds.setAttribute('label', 'Earbuds');
    //squigSelect.append(squigSelectGroupEarbuds);
    squigSelect.append(squigSelectGroupHeadphones);
    squigSelect.append(squigSelectGroupIems);
    
    $.getJSON(squigsitesJson, function(squigSites) {
        squigSites.forEach(function(site) {
            let username = site.username,
                name = site.name,
                url = username != 'nymz' ? 'https://' + username + '.squig.link' : 'https://squig.link',
                option = document.createElement('option'),
                dbs = site.dbs;
            
            dbs.forEach(function(db) {
                let type = db.type,
                    folder = db.folder,
                    dbUrl = url + folder,
                    dbOption = document.createElement('option'),
                    targetOptGroup = type === 'IEMs' ? squigSelectGroupIems : type === 'Headphones' ? squigSelectGroupHeadphones : type === 'Earbuds' ? squigSelectGroupEarbuds : NULL;

                dbOption.textContent = name;
                dbOption.value = dbUrl;
                dbOption.setAttribute('data-username', username)

                if (username === currentSite && currentDb === folder) {
                    dbOption.setAttribute('selected','');
                }
                targetOptGroup.append(dbOption);
            });
        });
        
        if (squigSites.length) {
            newLi.append(squigSelect);
            headerLinksUl.append(newLi);
            
            let squigSelectStyle = document.createElement('style'),
                squigSelectCss = `
                    ul.header-links li.squig-select-li {
                        order: -1;
                        position: relative;
                        padding: 6px 16px 0 0;
                        margin: 0 auto 0 -16px;

                        color: #fff;
                    }

                    li.squig-select-li:after {
                        position: absolute;
                        top: 21px;
                        right: 32px;

                        content: '';
                        display: block;
                        width: 4px;
                        height: 4px;

                        border-right: 1px solid var(--background-color-contrast-more);
                        border-bottom: 1px solid var(--background-color-contrast-more);

                        transform: rotate(45deg);
                    }

                    select.squig-select {
                        appearance: none;
                        position: relative;

                        display: flex;
                        box-sizing: border-box;
                        height: 36px;
                        padding: 2px 30px 0 16px;


                        background-color: transparent;
                        border: 1px solid var(--background-color-contrast-more);
                        border-radius: 18px;

                        color: currentColor;
                        outline:none;
                    }

                    select.squig-select option {
                        color: initial;
                    }

                    @media ( max-width: 1000px ) {
                        ul.header-links li.squig-select-li {
                            order: 1;

                            width: 100%;
                            height: auto;
                            padding-top: 16px;
                            margin: 36px 0 0 0;

                            border-top: 1px solid var(--font-color-primary);

                            color: var(--font-color-primary);
                        }

                        select.squig-select {
                            width: 100%;
                        }

                        li.squig-select-li:after {
                            top: 32px;
                        }
                    }
                `;
            
            squigSelectStyle.setAttribute('type','text/css');
            squigSelectStyle.textContent = squigSelectCss;
            document.querySelector('body').append(squigSelectStyle);
        }
    });
    
    function squigsiteChange(event) {
        let selectedSite = squigSelect.options[squigSelect.selectedIndex].value,
            selectedSiteName = squigSelect.options[squigSelect.selectedIndex].textContent;
        
        pushEventTag('squigsite_changed', targetWindow, selectedSiteName);
        window.location = selectedSite;
    }
}



// Init dbExplorer when the input field is focused
function initDbExplorer() {
    let filterInput = document.querySelector('input.search');
    
    filterInput.addEventListener('focus', handleInput);
    
    function handleInput() {
        let currentSite = window.location.host.split('.')[2] ? window.location.host.split('.')[0] : 'superreview';
        
        filterInput.removeEventListener('focus', handleInput);
        
        let readyTimer = setInterval(checkReady, 200);
        
        function checkReady() {
            let phoneCount = document.querySelectorAll('div.phone-item').length;
            
            if (phoneCount > 1) {
                clearInterval(readyTimer);
                dbExplorer();
            }
        }
    }
}

// Add other squigsite databases to phones list
function dbExplorer() {
    let squigsitesJson = mode === 'dev' ? 'squigsites.json' : 'https://fr.mmagtech.com/squigsites.json',
        currentSite = window.location.host.split('.')[2] ? window.location.host.split('.')[0] : 'superreview',
        currentDb = window.location.pathname;
    
    let dbExplorerStyle = document.createElement('style'),
        dbExplorerCss = `
            :root {
                --icon-new-tab: url("data:image/svg+xml,%3Csvg id='Layer_1' data-name='Layer 1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cdefs%3E%3Cstyle%3E.cls-1,.cls-2%7Bfill:none;stroke:%23231f20;%7D.cls-2%7Bstroke-linecap:round;%7D%3C/style%3E%3C/defs%3E%3Cpath class='cls-1' d='M21,11v2c0,3.77,0,5.66-1.17,6.83S16.77,21,13,21H11c-3.77,0-5.66,0-6.83-1.17S3,16.77,3,13V11C3,7.23,3,5.34,4.17,4.17S7.23,3,11,3h1'/%3E%3Cpath class='cls-2' d='M21,3.15H16.76m4.24,0V7.39m0-4.24-8.49,8.48'/%3E%3C/svg%3E");
            }

            section.db-site-container {
                background-color: var(--background-color-contrast);
                border-radius: 6px;
            }

            div.db-site-header {
                position: sticky;
                top:  -16px;
                z-index: 1;

                display: flex;
                display: none;
                margin: 11px 0 6px 0;

                background-color: var(--background-color-contrast);
                border-bottom: 1px solid var(--background-color);
                border-radius: 6px 6px 0 0;

                color: var(--accent-color);
                font-weight: bold;
            }

            div.db-site-header a {
                display: flex;
                flex: auto 1 1;
                padding: 11px 0 11px 12px;

                color: var(--accent-color-contrast);
                font-weight: 400;
                font-size: 12px;
                line-height: 1.5em;
                text-decoration: none;
            }

            div.db-site-header a:hover {
                text-decoration: underline;
            }

            div.fauxn-item {
                display: flex;
                display: none;
                padding: 0 0 6px 0;

                color: var(--font-color-primary);
                font-weight: 400;
                font-size: 12px;
                line-height: 1.5em;
            }

            div.fauxn-item a {
                display: flex;
                flex: auto 1 1;
                padding: 11px 0 11px 12px;

                color: var(--font-color-primary);
                text-decoration: none;
            }

            div.fauxn-item a:hover {
                text-decoration: underline;
            }

            div.db-site-header span,
            div.fauxn-item span {
                flex: auto 1 1;
            }

            div.fauxn-item a:before {
                content: '';
                display: block;
                flex: 18px 0 0;
                height: 18px;
                margin: 0 8px 0 0;

                background-color: var(--background-color-contrast-more);
                background-color: var(--accent-color-contrast);
                mask: var(--icon-new-tab);
                -webkit-mask: var(--icon-new-tab);
                mask-size: 14px;
                mask-repeat: no-repeat;
                mask-position: center;
                -webkit-mask-size: 14px;
                -webkit-mask-repeat: no-repeat;
                -webkit-mask-position: center;
            }

            @media (max-width: 1000px) {
                section.db-site-container {
                    margin-right: 6px;
                }

                div.db-site-header {
                    position: relative;
                    top: 0;

                    margin-right: 2px;
                }

                div.fauxn-item {
                    margin-right: 2px;
                }
            }
        `;

    dbExplorerStyle.setAttribute('type','text/css');
    dbExplorerStyle.textContent = dbExplorerCss;
    document.querySelector('body').append(dbExplorerStyle);
    
    // Get data about each site
    $.getJSON(squigsitesJson, function(squigSites) {
        squigSites.forEach(function(site) {
            let phoneList = document.querySelector('div#phones');
            
            let name = site.name,
                username = site.username,
                isCurrentSite = username === currentSite ? 1 : 0,
                url = username === 'superreview' ? 'https://squig.link' : 'https://' + username + '.squig.link',
                phoneBookJson = username === 'superreview' ? 'https://squig.link/data_mrs/phone_book.json' : 'https://'+ username +'.squig.link/data/phone_book.json',
                dbs = site.dbs;
            
            let siteContainer = document.createElement('section'),
                siteHeader = document.createElement('div'),
                siteHeaderLabel = document.createElement('span'),
                siteHeaderLink = document.createElement('a');
            
            //if (!isCurrentSite) {
                siteContainer.className = 'db-site-container';
                siteHeader.className = 'db-site-header';
                siteHeader.setAttribute('name-lower', name.toLowerCase());
                siteHeaderLabel.textContent = name;

                siteHeaderLink.setAttribute('href', url);
                siteHeaderLink.setAttribute('target', '_blank');
                siteHeader.append(siteHeaderLink);
                siteHeaderLink.append(siteHeaderLabel);

                siteHeaderLink.addEventListener('click', function() {
                    pushEventTag("clicked_dbExplorer", targetWindow, name);
                });

                siteContainer.append(siteHeader);
                phoneList.append(siteContainer);

                // Get phone_book json
                dbs.forEach(function(db) {
                    let folder = db.folder,
                        processThisJson = isCurrentSite ? currentDb === folder ? 0 : 1 : 1,
                        phoneBookJson = username === 'superreview' && folder === '/' ? 'https://squig.link/data_mrs/phone_book.json' : username === 'superreview' && folder === '/headphones/' ? 'https://squig.link/headphones/data/phone_book.json' : 'https://'+ username +'.squig.link'+ folder +'data/phone_book.json';
                    
                    //console.log(processThisJson, isCurrentSite, currentDb === folder);
                    
                    if (processThisJson) {
                        $.getJSON(phoneBookJson, function(phoneBook) {
                            phoneBook.forEach(function(brandPhones) {
                                let brandName = brandPhones.name;

                                brandPhones.phones.forEach(function(phone) {
                                    let phoneName = phone.name,
                                        displayName = brandName + ' ' + phoneName,
                                        siteHeaderNameLower = siteHeader.getAttribute('name-lower'),
                                        fileIsArray = Array.isArray(phone.file),
                                        fileName = fileIsArray ? phone.file[0] : phone.file,
                                        linkParam = fileName.replace(/ /g,"_"),
                                        link = url + folder + '?share=' + linkParam;

                                    let fauxnItem = document.createElement('div'),
                                        fauxnLink = document.createElement('a'),
                                        fauxnLabel = document.createElement('span');


                                    fauxnItem.className = 'fauxn-item';
                                    fauxnItem.setAttribute('name', name + ': ' + displayName);
                                    fauxnItem.setAttribute('name-lower', name.toLowerCase() + ': ' + displayName.toLowerCase());
                                    siteHeader.setAttribute('name-lower', siteHeaderNameLower + ' ' + displayName.toLowerCase());

                                    fauxnLink.className = 'fauxn-link';
                                    fauxnLink.setAttribute('href', link);
                                    fauxnLink.setAttribute('target','_blank');

                                    fauxnLabel.textContent = displayName;
                                    fauxnLink.append(fauxnLabel);
                                    fauxnItem.append(fauxnLink);
                                    siteContainer.append(fauxnItem);

                                    fauxnLink.addEventListener('click', function() {
                                        pushEventTag("clicked_dbExplorer", targetWindow, name + ': ' + displayName);
                                    });
                                });
                            });
                        });
                    }
                });
                // end get phone_book json
            //}
            // end if
       });
    });
}

function dbExplorerFilter() {
    let filterInput = document.querySelector('input.search'),
        dbExplorerFilterStyle = document.createElement('style');
    
    dbExplorerFilterStyle.setAttribute('type','text/css');
    document.querySelector('body').append(dbExplorerFilterStyle);
    
    filterInput.addEventListener('input', function(e) {
        let filterValue = filterInput.value.toLowerCase(),
            dbExplorerFilterCss = `
                div.db-site-header[name-lower*="`+ filterValue +`"],
                div.fauxn-item[name-lower*="`+ filterValue +`"]{
                    display: flex;
                }
            `;

        dbExplorerFilterStyle.textContent = dbExplorerFilterCss;
        document.querySelector('div.scroll#phones').scrollTop = 0;
    })
}
dbExplorerFilter();