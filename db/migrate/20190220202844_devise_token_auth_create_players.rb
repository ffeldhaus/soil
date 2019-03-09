class DeviseTokenAuthCreatePlayers < ActiveRecord::Migration[5.2]
  def change
    
    create_table(:players) do |t|
      # soil specific
      t.references :game, index: true

      ## Required
      t.string :provider, :null => false, :default => "email"
      t.string :uid, :null => false, :default => ""

      ## Database authenticatable
      t.string :encrypted_password, :null => false, :default => ""

      ## Rememberable
      t.datetime :remember_created_at

      ## Trackable
      #t.integer  :sign_in_count, :default => 0, :null => false
      #t.datetime :current_sign_in_at
      #t.datetime :last_sign_in_at
      #t.string   :current_sign_in_ip
      #t.string   :last_sign_in_ip

      ## Lockable
      # t.integer  :failed_attempts, :default => 0, :null => false # Only if lock strategy is :failed_attempts
      # t.string   :unlock_token # Only if unlock strategy is :email or :both
      # t.datetime :locked_at

      ## User Info
      t.string :email

      ## Tokens
      t.json :tokens

      t.timestamps
    end

    add_index :players, [:uid, :provider],     unique: true
    # add_index :players, :unlock_token,       unique: true
  end
end
