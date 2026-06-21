const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent

document.addEventListener('DOMContentLoaded', () => {
    const recordBtn = document.getElementById('recordBtn');
    const recordBtnText = document.getElementById('recordBtnText');
    const savedMantra = document.getElementById('savedMantra');

    // Recording and saving mantra
    if (recordBtn) {
        recordBtn.addEventListener('click', () => { 
            recordBtnText.textContent = "Recording..."
     
            // Form a speech recognition object
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            // Optionally add grammar list
            const grammar = '#JSGF V1.0; grammar mantra; public <mantra> = ohm namah shivaya | hare krishna hare krishna krishna hare hare hare ram hare ram ram ram hare hare | ohm | jai shree krishna'
            const speechRecognitionList = new SpeechGrammarList();
            speechRecognitionList.addFromString(grammar, 1);
            recognition.grammars = speechRecognitionList;

            recognition.start();

            console.log('recognition started');

            // Fetch results when available
            recognition.addEventListener("result", (event) => {

                // mantra using results fetched in json
                const mantra_to_save = event.results[0][0].transcript;
                if (mantra_to_save){
                    savedMantra.textContent = `${mantra_to_save}`;
                }
                else {
                    savedMantra.textContent = "Mantra to save is null";
                }
                
                // Need to choose one among both mantra or finalTranscript
                

                // finaltranscript using something I don't remeber rn 
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                    }
                }

                // Send to backend
                if (finalTranscript) {
                    fetch ('/save_mantra', {
                        method: 'POST',
                        headers: {
                            'Content-type': 'application/json'
                        },
                        body: JSON.stringify({ mantra_recorded: finalTranscript })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Success:', data.message);
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                    });
                }
                else {
                    console.log("finalTranscript did not work");
                }
            });
        });
    }

    // Click Event Delegation 
    document.addEventListener('click', function(e) {

        // Deleting saved Mantra
        if (e.target.closest('.delete-mantra-btn')) {
            console.log('Delete button clicked!');
            const button = e.target.closest('.delete-mantra-btn');
            const mantraToDelete = button.getAttribute('data-mantra');
            console.log('Mantra to delete:', mantraToDelete);
            
            // Confirms the user before deleting
            if (confirm('Are you sure you want to delete this mantra?')) {

                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '/mantra';
                
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'mantra_to_delete';
                input.value = mantraToDelete;
                
                form.appendChild(input);
                document.body.appendChild(form);
                form.submit();
            }
        }    
    });

    // Auto Chanting 
    // Setting variables
    const targetPrompt = document.getElementById('targetPrompt');
    const targetCountInput = document.getElementById('targetCountInput');
    const startChantingButton = document.getElementById('startChantingButton');
    const chantingSection = document.getElementById('chantingSection');
    const chantingMantraDisplay = document.getElementById('mantraDisplay')
    
    function normalizeText(text) {
        const fillerWords = ['um', 'uh', 'er', 'ah', 'like', 'you know'];
        const fillerWordsRegex = new RegExp(`\\b(${fillerWords.join('|')})\\b`, 'g');

        return text.toLowerCase()
            .replace(/[^\w\s]/g, '')     // Remove punctuation
            .replace(fillerWordsRegex, '') // Remove filler words
            .replace(/\s+/g, ' ')         // Normalize whitespace
            .trim();
    }

    // Get the mantra text which is to be chanted
    const mantraText = chantingMantraDisplay.innerHTML
    const normMantraText = normalizeText(mantraText)
    const wordsText = normMantraText.split(" ");
    const lastWordIndex = wordsText.length - 1;

    console.log(`Chanting Mantra: ${mantraText} and ${normMantraText}`)

    // Global counter to track total mantras across all sessions
    let globalCounter = 0;
    let originalTarget = 0;

    // Function which compares result and updates count
    function updateCountIfMatch(usedRecognition, target, currentCount = 0) {
        if (target) {
            console.log(`Got the target count ${target}, current count: ${currentCount}`);
            
            // Clear any existing event handlers to prevent conflicts
            usedRecognition.onresult = null;
            usedRecognition.onend = null;
            
            usedRecognition.start();
            console.log("started recording");

            // Use the passed currentCount instead of local counter
            let sessionCounter = 0; // Track mantras in this session only

            usedRecognition.onresult = function(event) {
                // Processing new results
                for (i = event.resultIndex; i < event.results.length; i++){
                    
                    // Store the new result
                    const mantraHeard = event.results[i][0].transcript;

                    // Normalize the text eg. radhey krishna radhey krishna
                    const normMantraHeard = normalizeText(mantraHeard);

                    // Get the list of words in the result
                    var wordsHeard = normMantraHeard.split(" ");

                    // Length of the list of words in the result
                    var lengthWordsHeard = wordsHeard.length;
                    
                    var itr = 0;
                    
                    // Iterate through words heard from the user
                    for (j = 0; j < lengthWordsHeard; j++){

                        // Check if they match to the words in the mantra(Text)
                        if (wordsHeard[j] == wordsText[itr]) {

                            // If the matched word is the last one in the mantra(Text)
                            if (itr == lastWordIndex) {
                                // Mantra finished, +1 in the counters
                                sessionCounter++;
                                globalCounter++;
                                console.log(`Session Counter: ${sessionCounter}, Global Counter: ${globalCounter}/${originalTarget}`);
                                itr = 0;
                            }
                            // Else keep iterating through mantra(Text) words
                            else {
                                itr++;
                            }
                        }
                    }

                    // Update display on screen
                    document.getElementById("chantingCounter").innerHTML = globalCounter;

                    // If we reached the original target, stop recognition
                    if (globalCounter >= originalTarget) {
                        alert("Target reached! Stopping recognition.");
                        usedRecognition.stop();
                        return;
                    }
                }
            }

            usedRecognition.onend = function() {
                console.log(`Session ended. Global count: ${globalCounter}/${originalTarget}`);
                
                // If target not completed
                if (globalCounter < originalTarget) {
                    const remainingCounts = originalTarget - globalCounter;
                    console.log(`Need ${remainingCounts} more mantras. Restarting...`);

                    // Small delay to prevent issues with rapid restart
                    setTimeout(() => {
                        updateCountIfMatch(usedRecognition, remainingCounts, globalCounter);
                    }, 100);
                }
                else {
                    console.log("Recognition ended, Hare Krishna! Target completed!");
                }
            }        
        }
    }

    // After start button clicked by user in Target Prompt
    if (startChantingButton) {
        startChantingButton.addEventListener('click', () => {

            // get the target of chanting rounds value
            targetCount = parseInt(targetCountInput.value, 10) || 5;

            // Reset global counter for new session
            globalCounter = 0;
            originalTarget = targetCount;

            // hide the prompt
            targetPrompt.classList.add('hidden');
            // show the chanting page
            chantingSection.classList.remove('hidden');

            // Ask for audio permissions   
            // Form a speech recognition object
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            // Make recognition continous
            recognition.continuous = true;

            // Variable mantra in grammer to be recognized as selected by the user
            const grammar = '#JSGF V1.0; grammar mantra; public <mantra> = '

            const speechRecognitionList = new SpeechGrammarList();
            speechRecognitionList.addFromString(grammar, 1);

            recognition.grammars = speechRecognitionList;

            // Function to match result and update counter
            updateCountIfMatch(recognition, targetCount);
        });
    }
});