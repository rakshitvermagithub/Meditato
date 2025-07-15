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
                const mantra_to_save = event.results[0][0].transcript;
                if (mantra_to_save){
                    savedMantra.textContent = `${mantra_to_save}`;
                }
                else {
                    savedMantra.textContent = "Mantra to save is null";
                }
                
                // Need to choose one among both mantra or finalTranscript

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

    // Click Event Delegation - ADD DEBUG LOGS
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

    // Chanting 
    // Setting variables
    const targetPrompt = document.getElementById('targetPrompt');
    const targetCountInput = document.getElementById('targetCountInput');
    const startChantingButton = document.getElementById('startChantingButton');
    const chantingSection = document.getElementById('chantingSection');

    // After start button clicked by user in Target Prompt
    if (startChantingButton) {
        startChantingButton.addEventListener('click', () => {
            // get the target value
            targetCount = parseInt(targetCountInput.value, 10) || 5;

            // hide the prompt
            targetPrompt.classList.add('hidden');
            // show the chanting page
            chantingSection.classList.remove('hidden');
        });
    }
});