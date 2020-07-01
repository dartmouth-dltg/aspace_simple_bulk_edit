require 'securerandom'

ArchivesSpace::Application.extend_aspace_routes(File.join(File.dirname(__FILE__), "routes.rb"))

Rails.application.config.after_initialize do
  
  # aggregate css & js on each restart - assume it will mean some css or js changes to local files
  plugin_directory = File.expand_path(File.dirname(__FILE__))

  plugin_name = plugin_directory.split("/")[-2]
  AppConfig[:dartmouth_bulk_container_update_precompile_assets_filename] = plugin_name + "-" + SecureRandom.hex
  old_aggregated_files = Dir.glob(File.join(plugin_directory,"assets","#{plugin_name}-*"))
  
  old_aggregated_files.each do |oaf|
    File.delete(oaf) if File.exist?(oaf)
  end

  css_files_to_be_aggregated = Dir[File.join(plugin_directory,"assets","dartmouth_bulk_container_update.css")]
  js_files_to_be_aggregated= Dir[File.join(plugin_directory,"assets","dartmouth_bulk_container_update.js")]
  
  File.open(File.join(plugin_directory,"assets", "#{AppConfig[:dartmouth_bulk_container_update_precompile_assets_filename]}.css"), "w") do |output_file|
    output_file.puts '@charset "utf-8";'
    css_files_to_be_aggregated.each do |input_file|
      File.open(input_file) do |file|
        file.each { |line|
          unless line.include?('@charset')
            output_file.puts line
          end
        }
      end
    end
  end
  
  File.open(File.join(plugin_directory,"assets", "#{AppConfig[:dartmouth_bulk_container_update_precompile_assets_filename]}.js"), "w") do |output_file|
    js_files_to_be_aggregated.each do |input_file|
      File.open(input_file) do |file|
        file.each { |line| output_file.puts line }
      end
    end
  end

  ActionView::PartialRenderer.class_eval do
    alias_method :render_pre_dartmouth_bulk_container_update, :render
    def render(context, options, block)
      result = render_pre_dartmouth_bulk_container_update(context, options, block);

      # Add our specific templates to shared/templates
      if options[:partial] == "shared/templates"
        result += render(context, options.merge(:partial => "bulk_container_update/bulk_container_templates"), nil)
      end

      result
    end
  end

end
