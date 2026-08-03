
// services/kotlinTemplates.ts

export const mainActivityKtTemplate = `package {{PACKAGE_NAME}}

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import com.google.android.material.card.MaterialCardView
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.constraintlayout.widget.ConstraintLayout

class MainActivity : AppCompatActivity() {

    private lateinit var recyclerViewChat: RecyclerView
    private lateinit var editTextMessage: EditText
    private lateinit var buttonSend: Button
    private lateinit var chatAdapter: ChatAdapter
    private val messageList = mutableListOf<Message>()
    
    private val isDarkTheme: Boolean = {{IS_DARK_THEME}}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        findViewById<TextView>(R.id.txtAppName).text = "{{APP_NAME}}"

        recyclerViewChat = findViewById(R.id.recyclerViewChat)
        editTextMessage = findViewById(R.id.editTextMessage)
        buttonSend = findViewById(R.id.buttonSend)

        setupChat()
    }

    private fun setupChat() {
        chatAdapter = ChatAdapter(messageList)
        recyclerViewChat.layoutManager = LinearLayoutManager(this)
        recyclerViewChat.adapter = chatAdapter

        messageList.add(Message("HeavyMobile AI", "Olá! Como posso ajudar você hoje? O layout do chat agora está otimizado."))
        chatAdapter.notifyItemInserted(messageList.size - 1)

        buttonSend.setOnClickListener {
            val messageText = editTextMessage.text.toString().trim()
            if (messageText.isEmpty()) return@setOnClickListener

            messageList.add(Message("Você", messageText))
            chatAdapter.notifyItemInserted(messageList.size - 1)
            recyclerViewChat.scrollToPosition(messageList.size - 1)
            editTextMessage.setText("") 

            Handler(Looper.getMainLooper()).postDelayed({
                val aiResponse = "Sincronização neural completa. Note como as bolhas de chat agora se alinham e mudam de cor dinamicamente."
                messageList.add(Message("HeavyMobile AI", aiResponse))
                chatAdapter.notifyItemInserted(messageList.size - 1)
                recyclerViewChat.scrollToPosition(messageList.size - 1)
            }, 800)
        }
    }

    data class Message(val sender: String, val text: String)

    inner class ChatAdapter(private val messages: MutableList<Message>) :
        RecyclerView.Adapter<ChatAdapter.MessageViewHolder>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_message, parent, false)
            return MessageViewHolder(view)
        }

        override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
            holder.bind(messages[position])
        }

        override fun getItemCount(): Int = messages.size

        inner class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
            private val messageCard: MaterialCardView = itemView.findViewById(R.id.messageCard)
            private val textViewMessage: TextView = itemView.findViewById(R.id.textViewMessage)
            private val textViewSender: TextView = itemView.findViewById(R.id.textViewSender)

            fun bind(message: Message) {
                textViewMessage.text = message.text
                textViewSender.text = message.sender.uppercase()

                val layoutParams = messageCard.layoutParams as ConstraintLayout.LayoutParams
                
                if (message.sender == "Você") {
                    // Estilo do Usuário (Direita)
                    messageCard.setCardBackgroundColor(ContextCompat.getColor(itemView.context, if (isDarkTheme) R.color.chat_bubble_user_dark else R.color.chat_bubble_user_light))
                    textViewMessage.setTextColor(ContextCompat.getColor(itemView.context, R.color.chat_text_user))
                    textViewSender.setTextColor(ContextCompat.getColor(itemView.context, R.color.chat_sender_user))
                    
                    layoutParams.horizontalBias = 1.0f // Alinha à direita
                } else {
                    // Estilo da IA (Esquerda)
                    messageCard.setCardBackgroundColor(ContextCompat.getColor(itemView.context, if (isDarkTheme) R.color.chat_bubble_ai_dark else R.color.chat_bubble_ai_light))
                    textViewMessage.setTextColor(ContextCompat.getColor(itemView.context, if (isDarkTheme) R.color.chat_text_ai_dark else R.color.chat_text_ai_light))
                    textViewSender.setTextColor(ContextCompat.getColor(itemView.context, if (isDarkTheme) R.color.chat_sender_ai_dark else R.color.chat_sender_ai_light))
                    
                    layoutParams.horizontalBias = 0.0f // Alinha à esquerda
                }
                
                messageCard.layoutParams = layoutParams
            }
        }
    }
}
`